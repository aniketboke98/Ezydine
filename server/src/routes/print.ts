import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

// Helper: Run shell command safely
function runCmd(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve(stdout.trim());
    });
  });
}

// 1. GET Connected Printers
router.get('/printers', async (req: Request, res: Response) => {
  try {
    const stdout = await runCmd('lpstat -p -d');
    const lines = stdout.split('\n');

    let defaultPrinter = '';
    const printers: Array<{ name: string; status: string; isDefault: boolean }> = [];

    for (const line of lines) {
      if (line.startsWith('system default destination:')) {
        defaultPrinter = line.replace('system default destination:', '').trim();
      } else if (line.startsWith('printer ')) {
        const parts = line.split(' ');
        if (parts.length >= 2) {
          const name = parts[1];
          const isIdle = line.includes('is idle');
          const isOffline = line.includes('offline');
          const status = isOffline ? 'offline' : isIdle ? 'idle' : 'busy';
          printers.push({
            name,
            status,
            isDefault: false,
          });
        }
      }
    }

    // Set default printer flag
    for (const p of printers) {
      if (p.name === defaultPrinter) {
        p.isDefault = true;
      }
    }

    // If defaultPrinter is not found, fallback to first printer
    if (!defaultPrinter && printers.length > 0) {
      defaultPrinter = printers[0].name;
      printers[0].isDefault = true;
    }

    return res.json({
      success: true,
      defaultPrinter,
      printers,
    });
  } catch (error: any) {
    console.error('Error discovering printers:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to discover printers',
      printers: [],
    });
  }
});

// Helper: Center text within width (58mm = 32 chars, 80mm = 48 chars)
function centerText(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const left = Math.floor((width - text.length) / 2);
  return ' '.repeat(left) + text;
}

// Helper: Justify text left and right
function justifyLine(left: string, right: string, width: number): string {
  const space = width - left.length - right.length;
  if (space <= 0) {
    return left.substring(0, width - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(space) + right;
}

// Helper: Format Order for POS Thermal Receipt (58mm or 80mm)
function formatReceiptText(data: {
  type: 'bill' | 'kot' | 'test';
  order?: any;
  template?: any;
  width?: '58mm' | '80mm';
}): string {
  const width = data.width === '80mm' ? 48 : 32;
  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);

  const tpl = data.template || {};
  const storeName = tpl.storeName || 'EZYDINE RESTOBAR';
  const phone = tpl.phone || '9876543210';
  const address = tpl.address || 'Bengaluru, India';
  const gstNo = tpl.gstNo || '';
  const footerMsg = tpl.footerMsg || 'Thank you for dining with us!';

  const lines: string[] = [];

  // Reset & Header
  lines.push('');
  lines.push(centerText(storeName.toUpperCase(), width));
  if (phone) lines.push(centerText(`Ph: ${phone}`, width));
  if (address) lines.push(centerText(address, width));
  if (gstNo) lines.push(centerText(`GSTIN: ${gstNo}`, width));
  lines.push(divider);

  if (data.type === 'test') {
    lines.push(centerText('** HARDWARE TEST SLIP **', width));
    lines.push(divider);
    lines.push(justifyLine('Printer Status:', 'ONLINE / READY', width));
    lines.push(justifyLine('Paper Roll Width:', `${width === 48 ? '80mm (48 Col)' : '58mm (32 Col)'}`, width));
    lines.push(justifyLine('Time:', new Date().toLocaleTimeString(), width));
    lines.push(justifyLine('Date:', new Date().toLocaleDateString(), width));
    lines.push(thinDivider);
    lines.push(centerText('Ezydine POS Hardware Link OK', width));
    lines.push(divider);
    lines.push('\n\n\n\n');
    return lines.join('\n');
  }

  const order = data.order || {};
  const isKOT = data.type === 'kot';

  // Receipt / KOT Title
  if (isKOT) {
    lines.push(centerText('*** KITCHEN ORDER TICKET (KOT) ***', width));
  } else {
    lines.push(centerText('TAX INVOICE / CASH BILL', width));
  }
  lines.push(divider);

  // Meta Info
  const orderId = isKOT
    ? (order.kotToken ? `TOKEN #${order.kotToken}` : (order.orderNumber || 'KOT-101'))
    : (order.billNumber || order.orderNumber || `BILL-${Date.now().toString().slice(-4)}`);
  const tableNo = order.tableNumber || order.table || 'Direct';
  const payMethod = (order.paymentMethod || 'CASH').toUpperCase();
  const dateStr = order.formattedDate && order.formattedTime
    ? `${order.formattedDate} ${order.formattedTime}`
    : (order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString());

  lines.push(justifyLine(`Table: ${tableNo}`, `Type: Dine-In`, width));
  lines.push(justifyLine(orderId, isKOT ? 'PREP' : payMethod, width));
  lines.push(justifyLine('Time:', dateStr, width));
  lines.push(thinDivider);

  // Items Header
  if (isKOT) {
    lines.push(justifyLine('ITEM (KITCHEN PREP)', 'QTY', width));
  } else {
    if (width === 48) {
      lines.push('ITEM                              QTY   AMOUNT');
    } else {
      lines.push(justifyLine('ITEM', 'QTY  TOTAL', width));
    }
  }
  lines.push(thinDivider);

  // Items List
  const items = order.items || [];
  for (const item of items) {
    const name = item.name || 'Item';
    const qty = item.quantity || 1;
    const price = parseFloat(item.price || 0);
    const itemTotal = (price * qty).toFixed(2);

    if (isKOT) {
      lines.push(justifyLine(name, `x${qty}`, width));
      const note = item.notes || item.specialNote;
      if (note) {
        lines.push(` * Note: ${note}`);
      }
    } else {
      if (width === 48) {
        const nameCol = name.padEnd(32).substring(0, 32);
        const qtyCol = `${qty}`.padStart(4);
        const amtCol = `₹${itemTotal}`.padStart(10);
        lines.push(`${nameCol} ${qtyCol} ${amtCol}`);
      } else {
        const left = name.substring(0, 18);
        const right = `${qty} ₹${itemTotal}`;
        lines.push(justifyLine(left, right, width));
      }
    }
  }
  lines.push(thinDivider);

  // Financials (Only on Bill, NOT on KOT)
  if (!isKOT) {
    const subtotal = parseFloat(order.subtotal || order.total || order.grandTotal || 0);
    const tax = parseFloat(
      order.tax !== undefined
        ? order.tax
        : (order.cgst || order.sgst)
        ? (parseFloat(order.cgst || 0) + parseFloat(order.sgst || 0))
        : 0
    );
    const discount = parseFloat(order.discount || 0);
    const grandTotal = parseFloat(order.grandTotal || order.total || (subtotal + tax - discount));

    if (discount > 0) {
      lines.push(justifyLine('Discount:', `-₹${discount.toFixed(2)}`, width));
    }
    if (tax > 0) {
      lines.push(justifyLine('GST / Taxes (5%):', `₹${tax.toFixed(2)}`, width));
    }
    lines.push(divider);
    lines.push(justifyLine('NET AMOUNT:', `Rs. ${grandTotal.toFixed(2)}`, width));
    lines.push(divider);
    lines.push(justifyLine('Payment Status:', `PAID (${payMethod})`, width));
    lines.push(thinDivider);
  } else {
    const chefNote = order.specialNote || order.notes;
    if (chefNote) {
      lines.push(`Special Chef Instructions:`);
      lines.push(`${chefNote}`);
      lines.push(thinDivider);
    }
    lines.push(centerText('-- Expedite Kitchen Order --', width));
  }
    lines.push(centerText('-- Expedite Kitchen Order --', width));
  }

  // Footer
  lines.push('');
  if (!isKOT && footerMsg) {
    lines.push(centerText(footerMsg, width));
  }
  lines.push(centerText('Powered by Ezydine POS', width));
  lines.push('\n\n\n\n'); // Feed lines so it rolls out cleanly for tearing

  return lines.join('\n');
}

// 2. POST Direct Hardware Print
router.post('/', async (req: Request, res: Response) => {
  try {
    const { printerName, type = 'bill', order, template, width = '58mm' } = req.body;

    // Check available printers
    const printersOutput = await runCmd('lpstat -p -d');
    let targetPrinter = printerName;

    if (!targetPrinter || targetPrinter === 'Auto-Detect' || targetPrinter === 'Default POS Printer') {
      // Pick system default
      const defaultMatch = printersOutput.match(/system default destination:\s*([^\n\r]+)/);
      if (defaultMatch && defaultMatch[1]) {
        targetPrinter = defaultMatch[1].trim();
      } else {
        // Find first printer
        const firstPrinterMatch = printersOutput.match(/printer\s+([^\s]+)/);
        if (firstPrinterMatch && firstPrinterMatch[1]) {
          targetPrinter = firstPrinterMatch[1].trim();
        }
      }
    }

    if (!targetPrinter) {
      return res.status(400).json({
        success: false,
        error: 'No connected thermal printer found on system.',
      });
    }

    // Format receipt text
    const receiptContent = formatReceiptText({
      type,
      order,
      template,
      width,
    });

    // Write to a temporary file in OS tmp directory
    const tmpFilePath = path.join(os.tmpdir(), `ezydine_print_${Date.now()}.txt`);
    fs.writeFileSync(tmpFilePath, receiptContent, 'utf-8');

    // Send to CUPS printer using lp
    // -d <printer> : specify destination
    // -o raw : pass raw text stream without PDF/postscript raster overhead
    const lpCommand = `lp -d "${targetPrinter}" "${tmpFilePath}"`;
    const lpResult = await runCmd(lpCommand);

    // Clean up temporary file after a short delay
    setTimeout(() => {
      try {
        if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
      } catch (e) {
        // ignore
      }
    }, 2000);

    return res.json({
      success: true,
      printer: targetPrinter,
      message: `Print dispatched directly to ${targetPrinter}`,
      lpOutput: lpResult,
    });
  } catch (error: any) {
    console.error('Error executing hardware print:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to print to hardware device',
    });
  }
});

export default router;
