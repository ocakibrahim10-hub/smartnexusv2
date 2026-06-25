import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanLine, Package, LogOut, FileText, ShoppingCart } from 'lucide-react-native';

export default function DashboardScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('user').then((val: string | null) => {
      if (val) setUser(JSON.parse(val));
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    navigation.replace('Login');
  };

  const menuItems = [
    { title: 'Depo / Barkod', icon: ScanLine, color: '#2563eb', screen: 'Scanner' },
    { title: 'Hızlı Satış (POS)', icon: ShoppingCart, color: '#ec4899', screen: 'Pos' },
    { title: 'Siparişler', icon: Package, color: '#10b981', screen: null },
    { title: 'Tahsilat', icon: FileText, color: '#f59e0b', screen: null },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.name}>{user?.name || 'Personel'}</Text>
          <Text style={styles.role}>{user?.role || 'Yetki Yok'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity 
              key={idx} 
              style={styles.card}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <View style={[styles.iconBg, { backgroundColor: item.color + '15' }]}>
                <Icon size={32} color={item.color} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  role: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  logoutBtn: {
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
});
