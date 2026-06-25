import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/api-errors';
import { saveSession, type PanelType } from '../lib/session';
import { APP_NAME, PRIMARY, PAGE_BG, IS_LIVE, API_URL } from '../config/env';

type LoginMode = 'email' | 'phone';

const PANELS: { id: PanelType; label: string }[] = [
  { id: 'isletme', label: 'İşletme' },
  { id: 'bayi', label: 'Bayi' },
  { id: 'nexusadmin', label: 'Admin' },
];

export default function LoginScreen({ navigation }: { navigation: { replace: (r: string) => void } }) {
  const [mode, setMode] = useState<LoginMode>('phone');
  const [panel, setPanel] = useState<PanelType>('isletme');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Otomatik giriş kontrolü App.tsx'te yapılır
  }, []);

  const handleLogin = async () => {
    if (!password || (mode === 'email' ? !email : !phone)) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'email' ? '/auth/login' : '/auth/login-phone';
      const body =
        mode === 'email'
          ? { email: email.trim(), password, panel }
          : { phone: phone.replace(/\D/g, ''), password, panel };

      let response;
      try {
        response = await api.post(endpoint, body);
      } catch (firstErr) {
        const retryable =
          axios.isAxiosError(firstErr) &&
          (!firstErr.response || firstErr.code === 'ECONNABORTED');
        if (!retryable) throw firstErr;
        response = await api.post(endpoint, body);
      }

      const { accessToken, refreshToken, user } = response.data;

      await saveSession({ accessToken, refreshToken, user });
      navigation.replace('Dashboard');
    } catch (err: unknown) {
      Alert.alert('Giriş Başarısız', getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{IS_LIVE ? 'CANLI MOD' : 'GELİŞTİRME'}</Text>
        </View>

        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>SN</Text>
          </View>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>Mine Bilişim · ERP · WMS · POS</Text>
        </View>

        <View style={styles.panelRow}>
          {PANELS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.panelChip, panel === p.id && styles.panelChipActive]}
              onPress={() => setPanel(p.id)}
            >
              <Text style={[styles.panelChipText, panel === p.id && styles.panelChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'phone' && styles.modeBtnActive]}
              onPress={() => setMode('phone')}
            >
              <Text style={[styles.modeText, mode === 'phone' && styles.modeTextActive]}>Telefon</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'email' && styles.modeBtnActive]}
              onPress={() => setMode('email')}
            >
              <Text style={[styles.modeText, mode === 'email' && styles.modeTextActive]}>E-posta</Text>
            </TouchableOpacity>
          </View>

          {mode === 'email' ? (
            <>
              <Text style={styles.label}>E-Posta</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@firma.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Cep Telefonu</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="5XX XXX XX XX"
                keyboardType="phone-pad"
              />
            </>
          )}

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Şifreniz"
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          {IS_LIVE ? `Canlı sunucu · ${API_URL.replace('/api', '')}` : 'Geliştirme modu'}
        </Text>
        {IS_LIVE && (
          <Text style={styles.hint}>
            İlk giriş 30–60 sn sürebilir. Şifre: bilgisayarınızdaki yerel DB ile canlı sunucu farklı olabilir.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
    justifyContent: 'center',
    padding: 24,
    minHeight: '100%',
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#E0E0FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: PRIMARY, letterSpacing: 1 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  title: { fontSize: 24, fontWeight: '900', color: '#1B1B1F', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#46464F', fontWeight: '500' },
  panelRow: { flexDirection: 'row', gap: 8, marginBottom: 16, justifyContent: 'center' },
  panelChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFEDF4',
    backgroundColor: '#fff',
  },
  panelChipActive: { backgroundColor: '#E0E0FF', borderColor: PRIMARY },
  panelChipText: { fontSize: 12, fontWeight: '700', color: '#46464F' },
  panelChipTextActive: { color: PRIMARY },
  form: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEDF4',
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F2FA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  modeBtnActive: { backgroundColor: '#fff' },
  modeText: { fontSize: 13, fontWeight: '700', color: '#46464F' },
  modeTextActive: { color: PRIMARY },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#46464F',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: PAGE_BG,
    borderWidth: 1,
    borderColor: '#EFEDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#1B1B1F',
  },
  button: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 11, color: '#9CA3AF' },
  hint: {
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 8,
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
  },
});
