import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ScanLine, ShoppingCart, LogOut, Monitor, Zap } from 'lucide-react-native';
import { clearSession, getSession, type SessionUser } from '../lib/session';
import { PRIMARY, PAGE_BG, IS_LIVE } from '../config/env';

export default function DashboardScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void; navigate: (r: string) => void };
}) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    getSession().then((s) => {
      if (!s) {
        navigation.replace('Login');
        return;
      }
      setUser(s.user);
    });
  }, [navigation]);

  const handleLogout = async () => {
    await clearSession();
    navigation.replace('Login');
  };

  const menuItems = [
    {
      title: 'SmartNexus Panel',
      desc: 'Tam ERP arayüzü (canlı)',
      icon: Monitor,
      color: PRIMARY,
      screen: 'Player',
    },
    {
      title: 'Hızlı Satış (POS)',
      desc: 'Native kasa ekranı',
      icon: ShoppingCart,
      color: '#ec4899',
      screen: 'Pos',
    },
    {
      title: 'Depo / Barkod',
      desc: 'WMS tarayıcı',
      icon: ScanLine,
      color: '#10b981',
      screen: 'Scanner',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot}>
            <Zap size={12} color={IS_LIVE ? '#16a34a' : '#f59e0b'} />
          </View>
          <View>
            <Text style={styles.greeting}>Merhaba,</Text>
            <Text style={styles.name}>{user?.name || 'Kullanıcı'}</Text>
            <Text style={styles.meta}>
              {user?.tenantName || ''} · {user?.role || ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>SmartNexus Player v2</Text>
        <Text style={styles.bannerSub}>
          {IS_LIVE ? 'Canlı sunucuya bağlı' : 'Yerel geliştirme modu'}
        </Text>
      </View>

      <View style={styles.grid}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.title}
              style={styles.card}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <View style={[styles.iconBg, { backgroundColor: item.color + '18' }]}>
                <Icon size={30} color={item.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEDF4',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  liveDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 13, color: '#46464F', fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '900', color: '#1B1B1F', marginTop: 2 },
  meta: { fontSize: 11, fontWeight: '600', color: PRIMARY, marginTop: 4 },
  logoutBtn: { padding: 12, backgroundColor: '#fef2f2', borderRadius: 12 },
  banner: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#E0E0FF',
    borderWidth: 1,
    borderColor: '#C8C8FF',
  },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#1B1B1F' },
  bannerSub: { fontSize: 12, color: PRIMARY, marginTop: 4, fontWeight: '600' },
  grid: { padding: 16, paddingTop: 8 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEDF4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1B1B1F' },
  cardDesc: { fontSize: 11, color: '#46464F', marginTop: 4 },
});
