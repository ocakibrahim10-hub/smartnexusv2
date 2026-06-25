import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, RefreshCw, Archive, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import api from '../lib/api';

export default function WmsScannerScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<any[]>([]);

  useEffect(() => {
    api.get('/inventory/warehouses').then(res => {
      const whs = res.data || [];
      setWarehouses(whs);
      if (whs.length > 0) setWarehouseId(whs[0].id);
    }).catch(err => console.log('Depolar alınamadı:', err));
  }, []);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Kamera izni gerekiyor</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    setScanned(true);
    setLoading(true);

    try {
      const res = await api.get(`/wms/scan/${encodeURIComponent(data)}`);
      const result = res.data;

      if (result.type === 'PRODUCT') {
        Alert.alert(
          'Ürün Bulundu',
          `${result.product.name}\nMevcut Stok: ${result.product.totalStock} ${result.product.unit}`,
          [
            { text: 'Mal Kabul (+)', onPress: () => handleAction('RECEIVE', result.product.barcode) },
            { text: 'Sevkiyat (-)', onPress: () => handleAction('DISPATCH', result.product.barcode) },
            { text: 'İptal', style: 'cancel', onPress: () => setScanned(false) }
          ]
        );
      } else {
        Alert.alert('Lokasyon', `${result.location.code}\n${result.location.label}`, [
          { text: 'Tamam', onPress: () => setScanned(false) }
        ]);
      }
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.message || 'Barkod bulunamadı', [
        { text: 'Tamam', onPress: () => setScanned(false) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'RECEIVE' | 'DISPATCH', barcode: string) => {
    try {
      const payload = { barcode, warehouseId, quantity: 1 };
      const endpoint = action === 'RECEIVE' ? '/wms/receive' : '/wms/dispatch';
      
      const res = await api.post(endpoint, payload);
      Alert.alert('Başarılı', res.data.message, [{ text: 'Tamam', onPress: () => setScanned(false) }]);
    } catch (err: any) {
      Alert.alert('İşlem Başarısız', err.response?.data?.message || 'Hata oluştu', [
        { text: 'Tamam', onPress: () => setScanned(false) }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39"],
        }}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Barkod Okutun</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Scanner Guide */}
          <View style={styles.guideContainer}>
            <View style={styles.guideBox} />
            {loading && <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />}
          </View>

          {/* Footer controls */}
          <View style={styles.footer}>
            {scanned && !loading && (
              <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
                <RefreshCw size={20} color="#fff" />
                <Text style={styles.rescanText}>Yeniden Okut</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  text: { fontSize: 16, color: '#334155', marginBottom: 16, fontWeight: '700' },
  btn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center'
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  guideContainer: {
    alignItems: 'center',
  },
  guideBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  rescanText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  }
});
