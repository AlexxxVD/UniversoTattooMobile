import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { Link, usePathname, useRouter } from 'expo-router';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// Controlador imperativo global para abrir el menú sin contexto
let openHandler: null | (() => void) = null;
export function setMenuOpenHandler(fn: null | (() => void)) {
  openHandler = fn;
}
export function openMenuDrawer() {
  if (openHandler) {
    openHandler();
  }
}

type IconPack = 'Ionicons' | 'MaterialCommunityIcons' | 'Feather';
type Item = {
  label: string;
  href: Href | string;
  icon?: { name: string; pack?: IconPack; color?: string; size?: number };
};

type MenuCtx = {
  openMenu: () => void;
  closeMenu: () => void;
};

const MenuContext = createContext<MenuCtx | null>(null);

export function useMenuDrawer() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenuDrawer debe usarse dentro de MenuDrawerProvider');
  return ctx;
}

function getHrefPath(href: Href | string): string {
  if (typeof href === 'string') return href;
  const p = (href as any)?.pathname;
  return typeof p === 'string' ? p : '';
}

function normalizePath(path: string | null | undefined): string {
  if (!path) return '';
  let p = path.split('?')[0].split('#')[0];
  p = p.replace(/\/index$/, '');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function toAbsoluteInGroup(targetPath: string, groupBase: string): string {
  const t = normalizePath(targetPath);
  if (t.startsWith('./')) return normalizePath(`${groupBase}/${t.slice(2)}`);
  if (t === '' || t === '.') return normalizePath(groupBase);
  return normalizePath(t);
}

function leafAfterGroup(absPath: string, groupBase: string): string {
  const p = normalizePath(absPath);
  if (p === groupBase) return '';
  if (p.startsWith(groupBase + '/')) {
    const after = p.slice(groupBase.length + 1);
    return after.split('/')[0] || '';
  }
  if (p === '' || p === '/') return '';
  const parts = p.replace(/^\//, '').split('/');
  return parts[0] || '';
}

function clamp(n: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, n));
}

function RenderIcon({ pack = 'Ionicons', name, color = '#111', size = 20 }: { pack?: IconPack; name: string; color?: string; size?: number }) {
  if (pack === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  if (pack === 'Feather') return <Feather name={name as any} size={size} color={color} />;
  return <Ionicons name={name as any} size={size} color={color} />;
}

export function MenuDrawerProvider({
  items,
  groupBase, // '/(admin)' o '/(client)'
  onLogout,
  logoutLabel = 'Cerrar sesión',
  children,
  edgeTopOffset = 0,
  disableEdgeSwipe = false,
}: PropsWithChildren<{
  items: Item[];
  groupBase: string;
  onLogout?: () => Promise<void> | void;
  logoutLabel?: string;
  edgeTopOffset?: number;
  disableEdgeSwipe?: boolean;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = normalizePath(pathname);
  const absCurrent = currentPath?.startsWith(groupBase)
    ? currentPath
    : normalizePath(currentPath === '' || currentPath === '/' ? groupBase : `${groupBase}${currentPath.startsWith('/') ? '' : '/'}${currentPath}`);

  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(320, Math.floor(width * 0.78));

  // Animación
  const [open, setOpen] = useState(false);
  const translateX = useSharedValue(-drawerWidth);

  const openMenu = useCallback(() => {
    setOpen(true);
    translateX.value = withTiming(0, { duration: 220 });
  }, [translateX]);

  const closeMenu = useCallback(() => {
    translateX.value = withTiming(-drawerWidth, { duration: 180 }, (finished) => {
      if (finished) runOnJS(setOpen)(false);
    });
  }, [drawerWidth, translateX]);

  // Registrar el handler imperativo cuando el provider está montado
  useEffect(() => {
    setMenuOpenHandler(openMenu);
    return () => setMenuOpenHandler(null);
  }, [openMenu]);

  const ctxValue = useMemo(() => ({ openMenu, closeMenu }), [openMenu, closeMenu]);

  // Cálculos
  const currentLeaf = useMemo(() => leafAfterGroup(absCurrent, groupBase), [absCurrent, groupBase]);
  const visibleItems = useMemo(() => {
    return items.filter((it) => {
      const raw = getHrefPath(it.href);
      const abs = toAbsoluteInGroup(raw, groupBase);
      const itemLeaf = leafAfterGroup(abs, groupBase);
      return itemLeaf !== currentLeaf;
    });
  }, [items, currentLeaf, groupBase]);
  const currentLabel = useMemo(() => {
    const match = items.find((it) => {
      const raw = getHrefPath(it.href);
      const abs = toAbsoluteInGroup(raw, groupBase);
      return leafAfterGroup(abs, groupBase) === currentLeaf;
    });
    return match?.label ?? '';
  }, [items, currentLeaf, groupBase]);

  // Gestos nativos
  const startX = useSharedValue(0);

  const panToClose = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      translateX.value = clamp(startX.value + e.translationX, -drawerWidth, 0);
    })
    .onEnd(() => {
      if (translateX.value < -drawerWidth * 0.5) {
        closeMenu();
      } else {
        translateX.value = withTiming(0, { duration: 160 });
      }
    });

  // Edge swipe para abrir: zona finita a la izquierda, por debajo del header
  const edgeSwipe = Gesture.Pan()
    .activeOffsetX(10)
    .onStart(() => {
      runOnJS(openMenu)();
    });

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Logout
  const [signingOut, setSigningOut] = useState(false);
  const handleLogoutPress = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (onLogout) await onLogout();
    } catch (e) {
      // opcional
    } finally {
      runOnJS(setSigningOut)(false);
      runOnJS(closeMenu)();
      router.replace('/(auth)' as Href);
    }
  };

  return (
    <MenuContext.Provider value={ctxValue}>
      {!open && !disableEdgeSwipe && (
        <GestureDetector gesture={edgeSwipe}>
          <View
            pointerEvents="box-only"
            style={[styles.edgeSwipeZone, { top: edgeTopOffset }]}
          />
        </GestureDetector>
      )}

      {children}

      <Modal visible={open} transparent statusBarTranslucent animationType="none" onRequestClose={closeMenu}>
        <Pressable style={styles.backdrop} onPress={closeMenu} />

        <GestureDetector gesture={panToClose}>
          <Animated.View style={[styles.drawer, { width: drawerWidth }, drawerStyle]}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Menú</Text>
              <Pressable onPress={closeMenu} style={styles.closeButton}>
                <Text style={styles.closeText}>Cerrar</Text>
              </Pressable>
            </View>

            {!!currentLabel && (
              <View style={styles.currentWrap}>
                <Text style={styles.currentPrefix}>Actual:</Text>
                <Text style={styles.currentLabel}>{currentLabel}</Text>
              </View>
            )}

            <View style={styles.items}>
              {visibleItems.map((it, idx) => (
                <Link key={idx} href={it.href as Href} asChild>
                  <Pressable
                    onPress={closeMenu}
                    style={({ pressed }) => [styles.item, pressed && { backgroundColor: '#f2f2f2' }]}
                  >
                    <View style={styles.itemRow}>
                      {it.icon?.name ? (
                        <RenderIcon
                          pack={it.icon.pack}
                          name={it.icon.name}
                          color={it.icon.color ?? '#111'}
                          size={it.icon.size ?? 20}
                        />
                      ) : null}
                      <Text style={styles.itemText}>{it.label}</Text>
                    </View>
                  </Pressable>
                </Link>
              ))}
            </View>

            <View style={styles.footer}>
              <Pressable
                onPress={handleLogoutPress}
                disabled={signingOut}
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && !signingOut && { opacity: 0.85 },
                  signingOut && { opacity: 0.7 },
                ]}
              >
                {signingOut ? (
                  <View style={styles.row}>
                    <ActivityIndicator size="small" color="#991B1B" />
                    <Text style={styles.logoutText}> Cerrando…</Text>
                  </View>
                ) : (
                  <View style={styles.row}>
                    <Ionicons name="log-out-outline" size={18} color="#B91C1C" />
                    <Text style={styles.logoutText}> Cerrar sesión</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>
      </Modal>
    </MenuContext.Provider>
  );
}

// Ícono hamburguesa (blanco) que abre el drawer con controlador global
export function HeaderBurger({ color = '#fff', size = 24 }: { color?: string; size?: number }) {
  return (
    <Pressable
      accessibilityLabel="Abrir menú"
      onPress={openMenuDrawer}
      style={styles.burger}
      hitSlop={12}
      testID="header-burger"
    >
      <View style={[styles.bar, { backgroundColor: color, width: size }]} />
      <View style={[styles.bar, { backgroundColor: color, width: Math.round(size * 0.75) }]} />
      <View style={[styles.bar, { backgroundColor: color, width: Math.round(size * 0.9) }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edgeSwipeZone: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 14,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  burger: { padding: 8, borderRadius: 8 },
  bar: { height: 2.5, marginVertical: 3, borderRadius: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    paddingTop: 42,
    paddingHorizontal: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  closeButton: { padding: 6 },
  closeText: { color: '#007AFF' },
  currentWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8, gap: 6, paddingHorizontal: 4 },
  currentPrefix: { color: '#6B7280' },
  currentLabel: { fontWeight: '700', color: '#1D4ED8', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  items: { marginTop: 8, gap: 6 },
  item: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemText: { fontSize: 16 },
  footer: { marginTop: 'auto', paddingVertical: 8, paddingHorizontal: 4 },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: { color: '#B91C1C', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
});