import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';

type Categoria = {
  id_categoria: string | number;
  nombre: string;
  descripcion?: string | null;
};

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [items, setItems] = useState<Categoria[]>([]);
  const [q, setQ] = useState(''); // búsqueda local

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');


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
          .limit(1)
          .maybeSingle();

        if (roleErr || userRow?.role !== 'admin') {
          Toast.show({ type: 'error', text1: 'Acceso denegado', text2: 'No tenés permisos de administrador' });
          router.replace('/(client)');
          return;
        }
        setIsAdmin(true);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  const fetchAll = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Categoria')
        .select('*')
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

  const create = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Toast.show({ type: 'error', text1: 'Nombre requerido', text2: 'Ingresá un nombre para la categoría' });
      return;
    }
    try {
      setCreating(true);
      const { error } = await supabase
        .from('Categoria')
        .insert({ nombre: trimmed, descripcion: desc || null });

      if (error) {
        // Intento de detectar duplicados (violación de unique)
        const msg = (error.message || '').toLowerCase();
        if (error.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
          Toast.show({ type: 'error', text1: 'Duplicado', text2: 'Ya existe una categoría con ese nombre' });
        } else {
          Toast.show({ type: 'error', text1: 'No se pudo crear la categoría', text2: error.message });
        }
        return;
      }

      setName('');
      setDesc('');
      Toast.show({ type: 'success', text1: 'Categoría creada' });
      await fetchAll();
    } catch (e: any) {
      console.error('[admin categories] create error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudo crear la categoría' });
    } finally {
      setCreating(false);
    }
  }, [name, desc, fetchAll]);

  
  if (checkingAuth) {
    return (
      <Screen scroll={false}>
        <HeaderBar title="Categorías" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <ActivityIndicator />
          <Text style={{ color: colors.textMuted, marginTop: spacing(1) }}>Verificando permisos...</Text>
        </View>
      </Screen>
    );
  }

  // Si no es admin, ya se navegó; devolvemos contenedor vacío
  if (!isAdmin) {
    return <Screen scroll={false}><HeaderBar title="Categorías" /></Screen>;
  }

  return (
    <Screen scroll={false}>
      <HeaderBar title="Categorías" />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <ActivityIndicator />
          <Text style={{ color: colors.textMuted, marginTop: spacing(1) }}>Cargando categorías...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          <FlatList
            data={filtered}
            keyExtractor={(i) => String(i.id_categoria)}
            contentContainerStyle={{ paddingBottom: spacing(10), gap: spacing(2) }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            ListHeaderComponent={
              <View style={{ gap: spacing(2), marginBottom: spacing(1) }}>
                <Card>
                  <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing(2) }}>
                    Nueva categoría
                  </Text>
                  <Input
                    label="Nombre"
                    value={name}
                    onChangeText={setName}
                    placeholder="Ej. Tintas"
                    editable={!creating}
                  />
                  <Input
                    label="Descripción (opcional)"
                    value={desc}
                    onChangeText={setDesc}
                    placeholder="Detalle de la categoría"
                    editable={!creating}
                  />
                  <Button title={creating ? 'Creando...' : 'Crear'} onPress={create} disabled={creating} />
                </Card>

                <Card>
                  <Input
                    label="Buscar"
                    value={q}
                    onChangeText={setQ}
                    placeholder="Filtrar por nombre"
                  />
                </Card>

                <Text style={{ color: colors.text, marginTop: spacing(1), fontWeight: '700' }}>
                  Listado
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Card>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.nombre}</Text>
                {item.descripcion ? (
                  <Text style={{ color: colors.textMuted, marginTop: 4 }}>{item.descripcion}</Text>
                ) : null}
              </Card>
            )}
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing(4) }}>
                No hay categorías.
              </Text>
            }
          />
        </View>
      )}
    </Screen>
  );
}