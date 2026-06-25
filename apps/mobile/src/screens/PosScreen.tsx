import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import { ArrowLeft, ShoppingCart, Plus, Minus, Search } from 'lucide-react-native';
import { posApi } from '../lib/api';

interface Product {
  id: string;
  name: string;
  barcode: string;
  salePrice: number;
  stock: number;
  imageUrl?: string;
}

export default function PosScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await posApi.getProducts();
      setProducts(data || []);
    } catch (e: any) {
      Alert.alert('Hata', 'Ürünler yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing && existing.qty > 1) {
        return prev.map((item) =>
          item.product.id === productId ? { ...item, qty: item.qty - 1 } : item
        );
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      setLoading(true);
      const items = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.qty,
        unitPrice: i.product.salePrice,
      }));
      await posApi.checkout({
        items,
        paymentMethod: 'CASH',
      });
      Alert.alert('Başarılı', 'Satış tamamlandı!');
      setCart([]);
    } catch (e: any) {
      Alert.alert('Hata', 'Ödeme alınamadı: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);

  const renderProduct = ({ item }: { item: Product }) => {
    const cartItem = cart.find((c) => c.product.id === item.id);
    const qty = cartItem ? cartItem.qty : 0;

    return (
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>₺{item.salePrice?.toFixed(2)}</Text>
          <Text style={styles.productStock}>Stok: {item.stock}</Text>
        </View>

        <View style={styles.actionRow}>
          {qty > 0 ? (
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                <Minus size={16} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item)}>
                <Plus size={16} color="#4f46e5" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
              <Text style={styles.addBtnText}>Ekle</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hızlı Satış (POS)</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Search size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
      )}

      {cart.length > 0 && (
        <View style={styles.cartFooter}>
          <View style={styles.cartSummary}>
            <View style={styles.cartIconWrapper}>
              <ShoppingCart size={24} color="#fff" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cart.length}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.cartTotalLabel}>Toplam</Text>
              <Text style={styles.cartTotalAmount}>₺{totalAmount.toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.checkoutBtnText}>Ödeme Al</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1f2937', marginLeft: 12 },
  iconButton: { padding: 4 },
  listContent: { padding: 12 },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: { flex: 1, minHeight: 60 },
  productName: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#111827' },
  productStock: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  actionRow: { marginTop: 12, alignItems: 'center' },
  addBtn: {
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  addBtnText: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    width: '100%',
    justifyContent: 'space-between',
  },
  qtyBtn: { padding: 8 },
  qtyText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'space-between',
  },
  cartSummary: { flexDirection: 'row', alignItems: 'center' },
  cartIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cartTotalLabel: { color: '#9ca3af', fontSize: 12 },
  cartTotalAmount: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  checkoutBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
