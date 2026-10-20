import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export interface BluetoothDevice {
  id: string;
  name: string;
  mac: string;
  type: '58mm' | '80mm';
  paired: boolean;
  rssi?: string;
}

interface BluetoothPrinterModalProps {
  visible: boolean;
  connectedDevice: string | null;
  paperWidth: '58mm' | '80mm';
  onClose: () => void;
  onSelectDevice: (device: BluetoothDevice) => void;
  onDisconnect: () => void;
  onPaperWidthChange: (width: '58mm' | '80mm') => void;
}

const DEFAULT_DEVICES: BluetoothDevice[] = [
  { id: 'dev_1', name: 'MPT-II (Bluetooth)', mac: '66:32:B1:8E:12:44', type: '58mm', paired: true, rssi: '-54 dBm' },
  { id: 'dev_2', name: 'RPP02N Printer', mac: '88:41:F2:19:AA:05', type: '58mm', paired: true, rssi: '-68 dBm' },
  { id: 'dev_3', name: 'POS-5802DD', mac: '12:34:56:78:90:AB', type: '58mm', paired: false, rssi: '-72 dBm' },
  { id: 'dev_4', name: 'Epson TM-T88VI', mac: 'AA:BB:CC:DD:EE:FF', type: '80mm', paired: true, rssi: '-60 dBm' },
];

export const BluetoothPrinterModal: React.FC<BluetoothPrinterModalProps> = ({
  visible,
  connectedDevice,
  paperWidth,
  onClose,
  onSelectDevice,
  onDisconnect,
  onPaperWidthChange,
}) => {
  const [devices, setDevices] = useState<BluetoothDevice[]>(DEFAULT_DEVICES);
  const [isScanning, setIsScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleStartScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setDevices((prev) => {
        const exists = prev.some((d) => d.id === 'dev_5');
        if (!exists) {
          return [
            ...prev,
            { id: 'dev_5', name: 'Sunmi InnerPrinter', mac: 'C4:55:77:88:99:11', type: '58mm', paired: false, rssi: '-48 dBm' },
            { id: 'dev_6', name: 'ZJiang ZJ-5809', mac: 'D8:22:33:44:55:66', type: '58mm', paired: false, rssi: '-79 dBm' },
          ];
        }
        return prev;
      });
      setIsScanning(false);
    }, 1800);
  };

  const handleConnect = (device: BluetoothDevice) => {
    setConnectingId(device.id);
    setTimeout(() => {
      setConnectingId(null);
      onSelectDevice(device);
      onPaperWidthChange(device.type);
      Alert.alert('Printer Connected', `${device.name} is now ready for printing receipts and KOTs.`);
    }, 1000);
  };

  const handleTestPrint = () => {
    if (!connectedDevice) {
      Alert.alert('No Printer Selected', 'Please pair or connect a Bluetooth printer before printing a test slip.');
      return;
    }
    Alert.alert(
      'Test Slip Sent',
      `Thermal test receipt successfully transmitted to ${connectedDevice} (${paperWidth} width).`
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Top Sheet Pull Bar */}
          <View style={styles.sheetHandleWrapper}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.bluetoothIconCircle}>
                <Ionicons name="bluetooth" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.title}>Bluetooth Thermal Printer</Text>
                <View style={styles.activeStatusRow}>
                  <View
                    style={[
                      styles.statusDotSmall,
                      { backgroundColor: connectedDevice ? Colors.successGreen : '#94A3B8' },
                    ]}
                  />
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {connectedDevice ? `Active: ${connectedDevice}` : 'No printer connected'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={Colors.navy} />
            </TouchableOpacity>
          </View>

          {/* Paper Width Segmented Control */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>THERMAL PAPER WIDTH</Text>
              <Text style={styles.sectionHint}>Select roll size</Text>
            </View>

            <View style={styles.segmentedContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  paperWidth === '58mm' && styles.segmentBtnActive,
                ]}
                onPress={() => onPaperWidthChange('58mm')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="document-text-outline"
                  size={15}
                  color={paperWidth === '58mm' ? '#FFFFFF' : Colors.navy}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    paperWidth === '58mm' && styles.segmentBtnTextActive,
                  ]}
                >
                  58mm (2-inch Pocket)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  paperWidth === '80mm' && styles.segmentBtnActive,
                ]}
                onPress={() => onPaperWidthChange('80mm')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="receipt-outline"
                  size={15}
                  color={paperWidth === '80mm' ? '#FFFFFF' : Colors.navy}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    paperWidth === '80mm' && styles.segmentBtnTextActive,
                  ]}
                >
                  80mm (3-inch Counter)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Scanner Header Row */}
          <View style={styles.scanActionRow}>
            <View>
              <Text style={styles.sectionLabel}>DISCOVERED DEVICES</Text>
              <Text style={styles.scanCount}>{devices.length} nearby printers</Text>
            </View>

            <TouchableOpacity
              style={[styles.scanBtn, isScanning && styles.scanBtnActive]}
              onPress={handleStartScan}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              {isScanning ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.scanBtnText}>Scanning...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="scan-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.scanBtnText}>Scan Devices</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Device Cards List */}
          <ScrollView
            style={styles.deviceList}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {devices.map((device) => {
              const isConnected = connectedDevice === device.name;
              const isConnecting = connectingId === device.id;

              return (
                <View
                  key={device.id}
                  style={[
                    styles.deviceCard,
                    isConnected && styles.deviceCardConnected,
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.deviceIconBox, isConnected && styles.deviceIconBoxConnected]}>
                      <Ionicons
                        name="print"
                        size={18}
                        color={isConnected ? Colors.successGreen : Colors.navy}
                      />
                    </View>

                    <View style={styles.cardDetails}>
                      <View style={styles.deviceNameRow}>
                        <Text style={styles.deviceName} numberOfLines={1}>
                          {device.name}
                        </Text>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>{device.type}</Text>
                        </View>
                      </View>

                      <Text style={styles.deviceMac}>
                        MAC: {device.mac} {device.rssi ? `· ${device.rssi}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardActionRow}>
                    {isConnected ? (
                      <View style={styles.connectedBadgeRow}>
                        <View style={styles.connectedPill}>
                          <Ionicons name="checkmark-circle" size={14} color={Colors.successGreen} />
                          <Text style={styles.connectedText}>Connected</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.disconnectBtn}
                          onPress={onDisconnect}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.disconnectBtnText}>Disconnect</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.connectBtn, isConnecting && styles.connectBtnDisabled]}
                        onPress={() => handleConnect(device)}
                        disabled={isConnecting}
                        activeOpacity={0.8}
                      >
                        {isConnecting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="link-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.connectBtnText}>Connect</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.testPrintBtn}
              onPress={handleTestPrint}
              activeOpacity={0.8}
            >
              <Ionicons
                name="receipt-outline"
                size={16}
                color={Colors.navy}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.testPrintText}>Print Test Slip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 41, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  bluetoothIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    flexShrink: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondaryText,
    letterSpacing: 0.6,
  },
  sectionHint: {
    fontSize: 11,
    color: '#94A3B8',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.navy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scanActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scanCount: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  scanBtnActive: {
    backgroundColor: '#0369A1',
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deviceList: {
    maxHeight: 250,
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 10,
  },
  deviceCardConnected: {
    borderColor: Colors.successGreen,
    backgroundColor: '#F0FDF4',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deviceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceIconBoxConnected: {
    backgroundColor: '#DCFCE7',
  },
  cardDetails: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    flexShrink: 1,
  },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
  deviceMac: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  connectedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  disconnectBtnText: {
    fontSize: 11,
    color: Colors.primaryRed,
    fontWeight: '700',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  connectBtnDisabled: {
    opacity: 0.6,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  testPrintBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testPrintText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  doneBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
