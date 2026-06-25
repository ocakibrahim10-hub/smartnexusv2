import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { WEB_URL, PRIMARY, PAGE_BG } from '../config/env';
import { buildWebSessionScript, getSession } from '../lib/session';

export default function PlayerScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [injectScript, setInjectScript] = useState<string | null>(null);
  const [startUrl, setStartUrl] = useState(WEB_URL);

  useEffect(() => {
    getSession().then((session) => {
      if (!session) {
        navigation.goBack();
        return;
      }
      const { user, accessToken, refreshToken, panel } = session;
      const home = user.homeRoute || '/dashboard';
      setStartUrl(`${WEB_URL}/${panel}${home.startsWith('/') ? home : `/${home}`}`);
      setInjectScript(
        buildWebSessionScript(user, accessToken, refreshToken, panel, WEB_URL),
      );
    });
  }, [navigation]);

  const onReload = useCallback(() => {
    setLoading(true);
    webRef.current?.reload();
  }, []);

  if (!injectScript) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>SmartNexus yükleniyor…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolBtn}>
          <ArrowLeft size={22} color="#1B1B1F" />
        </TouchableOpacity>
        <View style={styles.toolbarCenter}>
          <Text style={styles.toolbarTitle}>SmartNexus Panel</Text>
          <Text style={styles.toolbarSub}>Canlı mod · v2</Text>
        </View>
        <TouchableOpacity onPress={onReload} style={styles.toolBtn}>
          <RefreshCw size={20} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ uri: startUrl }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={injectScript}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        onError={() => setLoading(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAGE_BG },
  loadingText: { marginTop: 12, color: '#46464F', fontWeight: '600' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEDF4',
  },
  toolBtn: { padding: 10, borderRadius: 10 },
  toolbarCenter: { flex: 1, alignItems: 'center' },
  toolbarTitle: { fontSize: 15, fontWeight: '800', color: '#1B1B1F' },
  toolbarSub: { fontSize: 11, color: PRIMARY, fontWeight: '600', marginTop: 2 },
  loader: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(251,248,255,0.9)',
  },
  webview: { flex: 1, backgroundColor: PAGE_BG },
});
