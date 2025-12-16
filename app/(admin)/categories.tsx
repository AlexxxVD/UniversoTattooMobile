import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Card } from '../../components/ui/Card';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';

const C = {
  bg: '#0E1116',
  card: '#141821',
  border: '#2A2F3A',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  primary: '#7C3AED',
};

type Categoria = {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
  Producto: { count: number }[];
};

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState<Categoria[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) {
          Toast.show({ type: 'error', text1: 'Iniciá sesión', text2: 'Necesitás iniciar sesión para acceder' });
          router.replace('/(auth)');
          return;
        }
        const { data: userRow, error: roleErr } = await supabase
          .from('User')
          .select('role')
          .eq('id', user.id) 
          .single(); 

        if (roleErr || userRow?.role !== 'admin') {
          Toast.show({ type: 'error', text1: 'Acceso denegado', text2: 'No tenés permisos de administrador' });
          router.replace('/(client)');
          return;
        }
        setIsAdmin(true);
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Acceso denegado', text2: 'No se pudo verificar tu rol' });
        router.replace('/(client)');
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);
  
  const fetchAll = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Categoria')
        .select('*, Producto(count)')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setItems((data ?? []) as any);
    } catch (e: any) {
      console.error('[admin categories] fetch error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudieron cargar las categorías' });
    }
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  useEffect(() => {
    if (isAdmin && !checkingAuth) {
      initialLoad();
    }
  }, [isAdmin, checkingAuth, initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((c) => (c.nombre ?? '').toLowerCase().includes(term));
  }, [items, q]);

  if (checkingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
        <HeaderBar title="Categorías" />
        <View style={styles.centerContainer}>
          <ActivityIndicator />
          <Text style={{ color: colors.textMuted, marginTop: spacing(1) }}>Verificando permisos...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!isAdmin) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}><HeaderBar title="Categorías" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['right', 'bottom', 'left']}>
      <HeaderBar title="Categorías" />
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator />
          <Text style={{ color: colors.textMuted, marginTop: spacing(1) }}>Cargando categorías...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          <FlatList
            data={filtered}
            keyExtractor={(i) => String(i.id_categoria)}
            contentContainerStyle={{ paddingBottom: spacing(10), gap: spacing(2) }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <View style={{ gap: spacing(2), marginBottom: spacing(1) }}>
                <Card>
                  <Input label="Buscar" value={q} onChangeText={setQ} placeholder="Filtrar por nombre" />
                </Card>

                <Text style={{ color: colors.text, marginTop: spacing(1), fontWeight: '700' }}>
                  Listado
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const productCount = item.Producto[0]?.count ?? 0;
              return (
                <Card style={{ paddingVertical: spacing(2), paddingHorizontal: spacing(2.5), gap: spacing(0.5) }}>
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Text style={[styles.idText, { color: colors.textMuted }]}>
                        #{item.id_categoria}
                      </Text>
                      <Text style={[styles.nameText, { color: colors.text }]}>
                        {item.nombre}
                      </Text>
                    </View>
                    
                    <View style={styles.rowRight}>
                      
                      {/* 👇👇 ¡AQUÍ ESTÁ EL ÚLTIMO ARREGLO! 👇👇 */}
                      <Text style={[styles.countText, { color: colors.textMuted }]}>
                        {`${productCount} ${productCount === 1 ? 'producto' : 'productos'}`}
                      </Text>
                    </View>
                  </View>

                  {item.descripcion ? (
                    <Text style={[styles.descText, { color: colors.textMuted }]}>
                      {item.descripcion}
                    </Text>
                  ) : null}
                </Card>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing(4) }}>
                No hay categorías.
              </Text>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// Estilos
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1, 
  },
  rowRight: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 30,
  },
  nameText: {
    fontWeight: '700',
    fontSize: 16,
    flexShrink: 1, 
  },
  countText: {
    fontSize: 14,
  },
  descText: {
    marginTop: 4,
    marginLeft: 42, 
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    margin: 20,
  },
});