import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { Link, usePathname, useRouter } from 'expo-router';
import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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

function RenderIcon({ pack = 'Ionicons', name, color = '#A0A8B0', size = 20 }: { pack?: IconPack; name: string; color?: string; size?: number }) {
  if (pack === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  if (pack === 'Feather') return <Feather name={name as any} size={size} color={color} />;
  return <Ionicons name={name as any} size={size} color={color} />;
}

// Tema negro + violeta
const C = {
  bg: '#0E1116',
  text: '#F3F4F6',
  muted: '#A0A8B0',
  violet: '#7C3AED',
  activeBg: 'rgba(124,58,237,0.22)',
  hoverBg: 'rgba(255,255,255,0.05)',
  border: 'rgba(124,58,237,0.30)',
  dangerBg: 'rgba(239,68,68,0.12)',
  dangerBorder: 'rgba(239,68,68,0.35)',
  danger: '#FCA5A5',
};

export function MenuDrawerProvider({
  items,
  groupBase, // '/(admin)' o '/(client)'
  onLogout,
  logoutLabel = 'Cerrar sesión',
  children,
}: PropsWithChildren<{ items: Item[]; groupBase: string; onLogout?: () => Promise<void> | void; logoutLabel?: string }>) {
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

  const openMenu = () => {
    setOpen(true);
    translateX.value = withTiming(0, { duration: 220 });
  };
  const closeMenu = () => {
    translateX.value = withTiming(-drawerWidth, { duration: 180 }, (finished) => {
      if (finished) runOnJS(setOpen)(false);
    });
  };
  const ctxValue = useMemo(() => ({ openMenu, closeMenu }), []);

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

  // Edge swipe para abrir
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
      // Esperar un momento para asegurar que la sesión se limpie
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (e) {
      console.warn('[MenuDrawer] Error en logout:', e);
    }
    // Navegar después de que signOut se complete
    runOnJS(setSigningOut)(false);
    runOnJS(closeMenu)();
    router.replace('/(auth)' as Href);
  };

  return (
    <MenuContext.Provider value={ctxValue}>
      {!open && (
        <GestureDetector gesture={edgeSwipe}>
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { width: 24, left: 0 }]} />
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
                <View style={styles.currentPill}>
                  <Text style={styles.currentLabel}>{currentLabel}</Text>
                </View>
              </View>
            )}

            <View style={styles.items}>
              {visibleItems.map((it, idx) => (
                <Link key={idx} href={it.href as Href} asChild>
                  <Pressable
                    onPress={closeMenu}
                    style={({ pressed }) => [styles.item, pressed && { backgroundColor: C.hoverBg }]}
                  >
                    <View style={styles.itemRow}>
                      {it.icon?.name ? (
                        <RenderIcon
                          pack={it.icon.pack}
                          name={it.icon.name}
                          color={it.icon.color ?? C.muted}
                          size={it.icon.size ?? 24}
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
                  pressed && !signingOut && { opacity: 0.9 },
                  signingOut && { opacity: 0.7 },
                ]}
              >
                {signingOut ? (
                  <View style={styles.row}>
                    <ActivityIndicator size="small" color={C.danger} />
                    <Text style={styles.logoutText}> Cerrando…</Text>
                  </View>
                ) : (
                  <View style={styles.row}>
                    <Ionicons name="log-out-outline" size={22} color={C.danger} />
                    <Text style={styles.logoutText}> {logoutLabel}</Text>
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

export function HeaderBurger({ color = '#FFFFFF' }: { color?: string }) {
  const { openMenu } = useMenuDrawer();
  return (
    <Pressable accessibilityLabel="Abrir menú" onPress={openMenu} style={styles.burger}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={[styles.bar, { width: 18, backgroundColor: color }]} />
      <View style={[styles.bar, { width: 22, backgroundColor: color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  burger: { padding: 8, borderRadius: 8 },
  bar: { height: 2.5, backgroundColor: '#FFFFFF', marginVertical: 3, width: 24, borderRadius: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },

  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: C.bg,
    paddingTop: 42,
    paddingHorizontal: 12,
    elevation: 18,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  closeButton: { padding: 6 },
  closeText: { color: C.violet, fontWeight: '700' },

  currentWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8, gap: 6, paddingHorizontal: 4 },
  currentPrefix: { color: C.muted },
  currentPill: {
    backgroundColor: C.activeBg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  currentLabel: { fontWeight: '800', color: C.text },

  items: { marginTop: 8, gap: 8 },
  item: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  itemText: { fontSize: 17, fontWeight: '500', color: C.text },

  footer: { marginTop: 'auto', paddingVertical: 8, paddingHorizontal: 4 },
  logoutButton: {
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: { color: C.danger, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center' },
});