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

// Helper: Discover directly connected USB thermal printers via CUPS usb backend
async function getConnectedUsbPrinters(): Promise<Array<{ uri: string; name: string; isThermal: boolean }>> {
  if (os.platform() !== 'darwin') return [];
  try {
    const out = await runCmd('/usr/libexec/cups/backend/usb');
    const results: Array<{ uri: string; name: string; isThermal: boolean }> = [];
    const lines = out.split('\n');
    for (const line of lines) {
      const match = line.match(/^direct\s+([^\s]+)\s+"([^"]+)"/);
      if (match) {
        const uri = match[1];
        const name = match[2];
        const lower = (uri + ' ' + name + ' ' + line).toLowerCase();
        const isThermal = lower.includes('pos') || lower.includes('printe') || lower.includes('thermal') || lower.includes('receipt') || lower.includes('58') || lower.includes('80');
        results.push({ uri, name, isThermal });
      }
    }
    return results;
  } catch {
    return [];
  }
}

// 1. GET Connected Printers
router.get('/printers', async (req: Request, res: Response) => {
  try {
    let stdout = '';
    try {
      stdout = await runCmd('lpstat -p -d');
    } catch (e: any) {
      // CUPS not installed or no printers added (typical on cloud VPS / Docker)
      return res.json({
        success: true,
        defaultPrinter: '',
        printers: [],
        message: 'No CUPS hardware printers installed on backend host.',
      });
    }

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

    // Check directly connected USB hardware devices
    const usbPrinters = await getConnectedUsbPrinters();
    const activeUsb = usbPrinters.find(u => u.isThermal) || usbPrinters[0];

    // If an active USB printer matches one of our CUPS printers, ensure its status is marked idle
    if (activeUsb) {
      const normalizedUsbName = activeUsb.name.replace(/[^a-zA-Z0-9]/g, '_');
      for (const p of printers) {
        if (p.name === normalizedUsbName || p.name.includes('POS_58') || p.name.includes('POS80')) {
          p.status = 'idle'; // Physically connected and ready
        }
      }
    }

    // Set default printer flag
    for (const p of printers) {
      if (p.name === defaultPrinter) {
        p.isDefault = true;
      }
    }

    if (!defaultPrinter && printers.length > 0) {
      defaultPrinter = printers[0].name;
      printers[0].isDefault = true;
    }

    return res.json({
      success: true,
      defaultPrinter,
      printers,
      usbPrinters,
    });
  } catch (error: any) {
    console.error('Error discovering printers:', error);
    return res.json({
      success: true,
      defaultPrinter: '',
      printers: [],
      error: error.message || 'Printer discovery unavailable',
    });
  }
});

// Helper: Center text within width (58mm = 30 chars, 80mm = 42 chars)
function centerText(text: string, width: number): string {
  const clean = text.trim();
  if (clean.length >= width) return clean.substring(0, width);
  const left = Math.floor((width - clean.length) / 2);
  return ' '.repeat(left) + clean;
}

// Helper: Justify text left and right within exact width
function justifyLine(left: string, right: string, width: number): string {
  const l = left.trim();
  const r = right.trim();
  const space = width - l.length - r.length;
  if (space <= 0) {
    const maxLeft = Math.max(1, width - r.length - 1);
    return l.substring(0, maxLeft) + ' ' + r;
  }
  return l + ' '.repeat(space) + r;
}

// Helper: Format Order for POS Thermal Receipt (Clean 30/42 column text)
function formatReceiptText(data: {
  type: 'bill' | 'kot' | 'test';
  order?: any;
  template?: any;
  width?: '58mm' | '80mm';
}): string {
  // 58mm thermal printers have 384 dots width = 30-32 chars. 30 chars guarantees NO right margin overflow.
  // 80mm thermal printers have 576 dots width = 42-48 chars. 42 chars guarantees clean formatting.
  const width = data.width === '80mm' ? 42 : 30;
  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);

  const tpl = data.template || {};
  const storeName = tpl.storeName || 'EZYDINE RESTOBAR';
  const phone = tpl.phone || '9876543210';
  const address = tpl.address || 'Bengaluru, India';
  const gstNo = tpl.gstNo || '';
  const footerMsg = tpl.footerMsg || 'Thank you for dining with us!';

  const lines: string[] = [];

  // HARDWARE TEST SLIP
  if (data.type === 'test') {
    lines.push('');
    lines.push(centerText(storeName.toUpperCase(), width));
    lines.push(divider);
    lines.push(centerText('** HARDWARE TEST SLIP **', width));
    lines.push(divider);
    lines.push(justifyLine('Printer Status:', 'ONLINE / READY', width));
    lines.push(justifyLine('Paper Roll:', width === 42 ? '80mm (42 Col)' : '58mm (30 Col)', width));
    lines.push(justifyLine('Time:', new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), width));
    lines.push(justifyLine('Date:', new Date().toLocaleDateString('en-IN'), width));
    lines.push(thinDivider);
    lines.push(centerText('Ezydine POS Hardware Link OK', width));
    lines.push(divider);
    lines.push('\n\n\n\n');
    return lines.join('\n');
  }

  const order = data.order || {};
  const isKOT = data.type === 'kot';

  // KOT (KITCHEN ORDER TICKET)
  if (isKOT) {
    const token = order.kotToken ? `TOKEN #${order.kotToken}` : (order.orderNumber || 'KOT TOKEN');
    const tableNo = order.tableNumber || order.table || 'Table';
    const section = order.tableSection ? ` (${order.tableSection})` : '';
    const serverName = order.serverName || 'Staff';
    const timeStr = order.formattedTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = order.formattedDate || new Date().toLocaleDateString('en-IN');

    lines.push(centerText('*** KITCHEN ORDER TICKET ***', width));
    lines.push(centerText(token, width));
    lines.push(thinDivider);
    lines.push(justifyLine(`TABLE: ${tableNo}${section}`, `DINE-IN`, width));
    lines.push(justifyLine(`Server: ${serverName}`, timeStr, width));
    lines.push(thinDivider);
    lines.push(justifyLine('ITEM (PREPARATION)', 'QTY', width));
    lines.push(thinDivider);

    const items = order.items || [];
    for (const item of items) {
      const name = (item.name || 'Item').trim();
      const qty = item.quantity || 1;
      const qtyStr = `x${qty}`;

      // Left column for item name, right column for quantity
      lines.push(justifyLine(name, qtyStr, width));

      const note = item.notes || item.specialNote;
      if (note) {
        lines.push(` * Note: ${note.trim()}`);
      }
    }
    lines.push(thinDivider);

    const chefNote = order.specialNote || order.notes;
    if (chefNote) {
      lines.push('SPECIAL INSTRUCTIONS:');
      lines.push(`${chefNote.trim()}`);
      lines.push(thinDivider);
    }

    lines.push(centerText('-- Expedite Kitchen Order --', width));
    lines.push('\n\n');
    return lines.join('\n');
  }

  // CUSTOMER TAX INVOICE / CASH BILL
  const billNum = order.billNumber || order.orderNumber || `BILL #${Math.floor(1000 + Math.random() * 9000)}`;
  const tableNo = order.tableNumber || order.table || 'Direct';
  const payMethod = (order.paymentMethod || 'CASH').toUpperCase();
  const dateStr = order.formattedDate && order.formattedTime
    ? `${order.formattedDate} ${order.formattedTime}`
    : (order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'));

  // Header Details (Tight & compact layout, no wasted paper)
  lines.push(centerText(storeName.toUpperCase(), width));
  if (address) {
    const addrWords = address.split(' ');
    let currentLine = '';
    for (const word of addrWords) {
      if ((currentLine + ' ' + word).trim().length <= width) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(centerText(currentLine, width));
        currentLine = word;
      }
    }
    if (currentLine) lines.push(centerText(currentLine, width));
  }
  if (phone) lines.push(centerText(`Ph: ${phone}`, width));
  if (gstNo) lines.push(centerText(`GSTIN: ${gstNo}`, width));

  // Single clean divider into Bill Info (Removes excessive space)
  lines.push(thinDivider);
  lines.push(justifyLine(billNum, `Table: ${tableNo}`, width));
  lines.push(justifyLine(dateStr, payMethod, width));
  if (order.customerName) {
    lines.push(justifyLine(`Guest: ${order.customerName}`, '', width));
  }
  lines.push(thinDivider);

  // Column Headers (58mm = 30 col: Item 16, Qty 4, Amount 10)
  // (80mm = 42 col: Item 22, Qty 5, Rate 7, Amount 8)
  if (width === 42) {
    lines.push('ITEM                   QTY    RATE   TOTAL');
  } else {
    lines.push('ITEM             QTY    AMOUNT');
  }
  lines.push(thinDivider);

  // Items List
  const items = order.items || [];
  for (const item of items) {
    const name = (item.name || 'Item').trim();
    const qty = item.quantity || 1;
    const price = parseFloat(item.price || 0);
    const itemTotal = (price * qty).toFixed(2);

    if (width === 42) {
      const colName = name.slice(0, 21).padEnd(21);
      const colQty = String(qty).padStart(4);
      const colRate = price.toFixed(2).padStart(8);
      const colTotal = itemTotal.padStart(9);
      lines.push(`${colName} ${colQty} ${colRate} ${colTotal}`);
    } else {
      // 30 column layout: 16 chars Item + 4 chars Qty + 10 chars Amount
      const colName = name.slice(0, 16).padEnd(16);
      const colQty = String(qty).padStart(4);
      const colTotal = itemTotal.padStart(10);
      lines.push(`${colName}${colQty}${colTotal}`);
    }
  }
  lines.push(thinDivider);

  // Financials & Summary
  const subtotal = parseFloat(order.subtotal || order.total || order.grandTotal || 0);
  const cgst = parseFloat(order.cgst || (order.tax ? order.tax / 2 : 0));
  const sgst = parseFloat(order.sgst || (order.tax ? order.tax / 2 : 0));
  const discount = parseFloat(order.discount || 0);
  const grandTotal = parseFloat(order.grandTotal || order.total || (subtotal + cgst + sgst - discount));

  lines.push(justifyLine('Sub Total:', subtotal.toFixed(2), width));
  if (discount > 0) {
    lines.push(justifyLine('Discount:', `-${discount.toFixed(2)}`, width));
  }
  if (cgst > 0) {
    lines.push(justifyLine('CGST (2.5%):', cgst.toFixed(2), width));
  }
  if (sgst > 0) {
    lines.push(justifyLine('SGST (2.5%):', sgst.toFixed(2), width));
  }
  lines.push(divider);
  lines.push(justifyLine('TOTAL AMOUNT:', `Rs. ${grandTotal.toFixed(2)}`, width));
  lines.push(divider);
  lines.push(justifyLine(`Payment: ${payMethod}`, 'Status: PAID', width));
  lines.push(thinDivider);

  // Footer
  if (footerMsg) {
    lines.push(centerText(footerMsg, width));
  }
  lines.push(centerText('Powered by Ezydine POS', width));
  lines.push('\n\n'); // Feed 2 lines so paper rolls cleanly past cutter

  return lines.join('\n');
}

// Helper: Build Native ESC/POS Binary Buffer for Professional Thermal Printing
function buildEscPosBuffer(data: {
  type: 'bill' | 'kot' | 'test';
  order?: any;
  template?: any;
  width?: '58mm' | '80mm';
}): Buffer {
  const chunks: Buffer[] = [];

  // ESC/POS Command Constants
  const ESC = 0x1b;
  const GS = 0x1d;

  const CMD_INIT = Buffer.from([ESC, 0x40]); // Initialize
  const CMD_ALIGN_CENTER = Buffer.from([ESC, 0x61, 0x01]); // Align Center
  const CMD_ALIGN_LEFT = Buffer.from([ESC, 0x61, 0x00]); // Align Left
  const CMD_ALIGN_RIGHT = Buffer.from([ESC, 0x61, 0x02]); // Align Right
  const CMD_BOLD_ON = Buffer.from([ESC, 0x45, 0x01]); // Bold ON
  const CMD_BOLD_OFF = Buffer.from([ESC, 0x45, 0x00]); // Bold OFF
  const CMD_DOUBLE_SIZE = Buffer.from([GS, 0x21, 0x11]); // 2x Width & 2x Height
  const CMD_NORMAL_SIZE = Buffer.from([GS, 0x21, 0x00]); // Normal Size
  const CMD_FEED_CUT = Buffer.from([ESC, 0x64, 0x02, GS, 0x56, 0x00]); // Feed 2 lines & Full Cut

  chunks.push(CMD_INIT);

  const cleanText = formatReceiptText(data);
  const textBuffer = Buffer.from(cleanText, 'ascii');
  chunks.push(textBuffer);
  chunks.push(CMD_FEED_CUT);

  return Buffer.concat(chunks);
}

// 2. POST Direct Hardware Print
router.post('/', async (req: Request, res: Response) => {
  try {
    const { printerName, type = 'bill', order, template, width = '58mm' } = req.body;

    // Discover system printers safely
    let printersOutput = '';
    try {
      printersOutput = await runCmd('lpstat -p -d');
    } catch {
      // Server does not have local CUPS printers (e.g. cloud VPS)
      return res.json({
        success: true,
        printedViaServer: false,
        fallbackToBrowser: true,
        message: 'No CUPS thermal printer configured on server. Handing off to browser printing.',
      });
    }

    // Parse valid CUPS destination names from printersOutput
    const validPrinters: string[] = [];
    for (const line of printersOutput.split('\n')) {
      const match = line.match(/^printer\s+([^\s]+)/);
      if (match) {
        validPrinters.push(match[1]);
      }
    }

    const defaultMatch = printersOutput.match(/system default destination:\s*([^\n\r]+)/);
    const systemDefault = defaultMatch && defaultMatch[1] ? defaultMatch[1].trim() : (validPrinters[0] || '');

    let targetPrinter = printerName ? String(printerName).trim() : '';

    // If no printer requested or generic placeholder, use default
    if (!targetPrinter || targetPrinter.includes('Default') || targetPrinter === 'Auto-Detect') {
      targetPrinter = systemDefault;
    } else if (!validPrinters.includes(targetPrinter)) {
      // Find exact or closest match in valid CUPS printers (e.g. "KPrinte" -> "Printe_KPrinte" / "Printer_POS_58")
      const cleanTarget = targetPrinter.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = validPrinters.find(p => {
        const cleanP = p.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanP === cleanTarget || cleanP.includes(cleanTarget) || cleanTarget.includes(cleanP);
      });
      targetPrinter = matched || systemDefault;
    }

    // If targetPrinter resolved to Printe_KPrinte (generic postscript) and Printer_POS_58 exists (actual POS-58 driver), prefer Printer_POS_58
    if ((targetPrinter === 'Printe_KPrinte' || targetPrinter.toLowerCase().includes('kprinte')) && validPrinters.includes('Printer_POS_58')) {
      targetPrinter = 'Printer_POS_58';
    }

    if (!targetPrinter) {
      return res.json({
        success: true,
        printedViaServer: false,
        fallbackToBrowser: true,
        message: 'No connected thermal printer found on server. Handing off to browser printing.',
      });
    }

    // Determine width setting (Auto-detect 80mm from printer name if not provided)
    const effectiveWidth: '58mm' | '80mm' =
      width === '80mm' || targetPrinter.toLowerCase().includes('80') ? '80mm' : '58mm';

    // Generate high quality ESC/POS binary data
    const escposBuffer = buildEscPosBuffer({
      type,
      order,
      template,
      width: effectiveWidth,
    });

    const tmpFilePath = path.join(os.tmpdir(), `ezydine_escpos_${Date.now()}.bin`);
    fs.writeFileSync(tmpFilePath, escposBuffer);

    let printedVia = '';
    let dispatchOutput = '';

    // Strategy 1: On macOS, check if direct USB connection exists for hardware thermal printing
    const usbPrinters = await getConnectedUsbPrinters();
    let directUsbUri = '';
    for (const u of usbPrinters) {
      const uLower = u.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const tLower = targetPrinter.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (uLower.includes(tLower) || tLower.includes(uLower) || (u.isThermal && tLower.includes('pos'))) {
        directUsbUri = u.uri;
        break;
      }
    }
    if (!directUsbUri && usbPrinters.length > 0 && usbPrinters[0].isThermal) {
      directUsbUri = usbPrinters[0].uri;
    }

    if (directUsbUri && fs.existsSync('/usr/libexec/cups/backend/usb')) {
      try {
        console.log(`[Print Service] Dispatching directly via macOS USB backend: ${directUsbUri}`);
        const cmd = `DEVICE_URI="${directUsbUri}" /usr/libexec/cups/backend/usb 1 ezydine "POS Receipt" 1 "" "${tmpFilePath}"`;
        dispatchOutput = await runCmd(cmd);
        printedVia = `direct_usb (${directUsbUri})`;
      } catch (usbErr: any) {
        console.warn('Direct USB backend dispatch failed, falling back to CUPS lp:', usbErr.message);
      }
    }

    // Strategy 2: If direct USB wasn't used or failed, dispatch via CUPS lp
    if (!printedVia) {
      try {
        // Ensure queue is enabled before sending
        try { await runCmd(`cupsenable "${targetPrinter}"`); } catch {}

        // Standard spooling without -o raw avoids macOS USBGenericPrintingClass stall
        const plainText = formatReceiptText({
          type,
          order,
          template,
          width: effectiveWidth,
        });
        const txtPath = path.join(os.tmpdir(), `ezydine_text_${Date.now()}.txt`);
        fs.writeFileSync(txtPath, plainText, 'ascii');
        dispatchOutput = await runCmd(`lp -d "${targetPrinter}" "${txtPath}"`);
        printedVia = `cups_lp (${targetPrinter})`;
        setTimeout(() => {
          try { if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath); } catch {}
        }, 3000);
      } catch (lpErr: any) {
        console.warn(`lp standard failed for ${targetPrinter}, falling back to system default:`, lpErr.message);
        if (targetPrinter !== systemDefault && systemDefault) {
          try {
            await runCmd(`cupsenable "${systemDefault}"`);
            const plainText = formatReceiptText({ type, order, template, width: effectiveWidth });
            const txtPath = path.join(os.tmpdir(), `ezydine_text_${Date.now()}.txt`);
            fs.writeFileSync(txtPath, plainText, 'ascii');
            dispatchOutput = await runCmd(`lp -d "${systemDefault}" "${txtPath}"`);
            printedVia = `cups_lp (${systemDefault})`;
            targetPrinter = systemDefault;
            setTimeout(() => {
              try { if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath); } catch {}
            }, 3000);
          } catch (retryErr: any) {
            throw retryErr;
          }
        } else {
          throw lpErr;
        }
      }
    }

    // Cleanup temporary binary file
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
      printedVia,
      width: effectiveWidth,
      message: `Print dispatched cleanly to ${targetPrinter}`,
      lpOutput: dispatchOutput,
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
