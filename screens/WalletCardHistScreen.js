import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Modal, TextInput, Platform, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppState } from '../App';

const C = {
  bg: '#0A0A0F', s1: '#13131A', s2: '#1C1C26',
  b1: 'rgba(255,255,255,0.07)', b2: 'rgba(255,255,255,0.12)',
  acc: '#00E5A0', warn: '#FFB547', danger: '#FF5B5B',
  t1: '#F0F0F5', t2: '#8888A0', t3: '#5A5A6E',
};
const fmt = n => new Intl.NumberFormat('es-CO').format(Math.round(n));

// ─── WALLET SCREEN ────────────────────────────────────────
export function WalletScreen({ navigation }) {
  const [balance, setBalance] = useState(AppState.balance);
  const [movements, setMovements] = useState([...AppState.movements]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [tfAmt, setTfAmt] = useState('');
  const [tfDest, setTfDest] = useState('');

  useFocusEffect(useCallback(() => {
    setBalance(AppState.balance);
    setMovements([...AppState.movements]);
  }, []));

  function refresh() {
    setBalance(AppState.balance);
    setMovements([...AppState.movements]);
  }

  function demoIncome() {
    AppState.addMovement('in', 'Cobro con tarjeta', '•••• 8812 (Visa) · demo', 50000, '⬡');
    refresh();
  }
  function demoPago() {
    if (AppState.balance < 30000) { Alert.alert('Saldo insuficiente'); return; }
    AppState.addMovement('out', 'Pago proveedor', 'Proveedor demo · Bre-B', 30000, '↗');
    refresh();
  }
  function demoP2P() {
    if (AppState.balance < 15000) { Alert.alert('Saldo insuficiente'); return; }
    AppState.addMovement('out', 'Envío P2P TapCo', '@pedrog · on-us · gratis', 15000, '→');
    refresh();
  }
  function doTransfer() {
    const amt = parseInt(tfAmt || '0', 10);
    if (!amt || amt < 1000) { Alert.alert('Monto mínimo $1.000'); return; }
    if (!tfDest) { Alert.alert('Ingresa un destinatario'); return; }
    if (amt > AppState.balance) { Alert.alert('Saldo insuficiente'); return; }
    AppState.addMovement('out', 'Envío a ' + tfDest, 'TapCo P2P · on-us · gratis', amt, '↗');
    setShowTransfer(false); setTfAmt(''); setTfDest('');
    refresh();
    Alert.alert('✓ Enviado', `$${fmt(amt)} enviados a ${tfDest} (mock)`);
  }

  const CONTACTS = [
    { name: 'Pedro Gómez', id: '@pedrog', initials: 'PG', color: '#0F2A1E', tc: '#5DCAA5' },
    { name: 'Laura Martínez', id: '@lauram', initials: 'LM', color: '#1A1A2E', tc: '#AFA9EC' },
    { name: 'Banco externo', id: 'Bre-B', initials: 'BE', color: '#1A1010', tc: '#FF9B9B' },
  ];

  return (
    <SafeAreaView style={ws.container}>
      <View style={ws.topbar}>
        <View style={ws.brand}><View style={ws.brandDot} /><Text style={ws.brandName}>TapCo</Text></View>
        <View style={ws.sandboxPill}><Text style={ws.sandboxText}>SANDBOX</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero balance */}
        <View style={ws.hero}>
          <Text style={ws.heroLabel}>SALDO DISPONIBLE</Text>
          <Text style={ws.heroBalance}>${fmt(balance)}</Text>
          <Text style={ws.heroSub}>Cuenta TapCo · exento 4×1000</Text>
        </View>

        {/* Quick actions */}
        <View style={ws.actions}>
          {[
            { icon: '↗', label: 'Enviar', onPress: () => setShowTransfer(true) },
            { icon: '↙', label: 'Recibir', onPress: () => { AppState.addMovement('in','Transferencia recibida','@lauram · TapCo',20000,'↙'); refresh(); } },
            { icon: '◫', label: 'Tarjeta', onPress: () => navigation.navigate('Tarjeta') },
            { icon: '+', label: 'Recargar', onPress: () => { AppState.addMovement('in','Recarga PSE','Bancolombia · PSE',100000,'+'); refresh(); } },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={ws.action} onPress={a.onPress}>
              <View style={ws.actionIcon}><Text style={{ fontSize: 18, color: C.acc }}>{a.icon}</Text></View>
              <Text style={ws.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Demo controls */}
        <View style={ws.demoBar}>
          <Text style={ws.demoTitle}>// DEMO — simular movimientos</Text>
          <View style={ws.demoBtns}>
            <TouchableOpacity style={ws.demoBtn} onPress={demoIncome}><Text style={ws.demoBtnText}>+ Ingreso $50k</Text></TouchableOpacity>
            <TouchableOpacity style={ws.demoBtn} onPress={demoPago}><Text style={ws.demoBtnText}>- Pago $30k</Text></TouchableOpacity>
            <TouchableOpacity style={ws.demoBtn} onPress={demoP2P}><Text style={ws.demoBtnText}>→ P2P $15k</Text></TouchableOpacity>
          </View>
        </View>

        {/* Movements */}
        <Text style={ws.secTitle}>Movimientos recientes</Text>
        {movements.length === 0 ? (
          <View style={ws.empty}><Text style={ws.emptyIcon}>◎</Text><Text style={ws.emptyText}>Aquí aparecerán tus cobros y pagos</Text></View>
        ) : (
          movements.slice(0, 10).map((m, i) => (
            <View key={i} style={ws.txnRow}>
              <View style={ws.txnIco}><Text style={{ fontSize: 16 }}>{m.icon}</Text></View>
              <View style={ws.txnInf}>
                <Text style={ws.txnNm}>{m.label}</Text>
                <Text style={ws.txnMt}>{m.sub}</Text>
              </View>
              <Text style={[ws.txnAmt, m.type === 'in' ? ws.txnPos : ws.txnNeg]}>
                {m.type === 'in' ? '+' : '-'}${fmt(m.amt)}
              </Text>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Transfer Modal */}
      <Modal visible={showTransfer} transparent animationType="slide">
        <TouchableOpacity style={ws.modalBg} activeOpacity={1} onPress={() => setShowTransfer(false)}>
          <View style={ws.modal}>
            <View style={ws.modalHandle} />
            <Text style={ws.modalTitle}>Enviar dinero</Text>
            <TextInput style={ws.input} placeholder="Monto COP" placeholderTextColor={C.t3} keyboardType="numeric" value={tfAmt} onChangeText={setTfAmt} />
            <TextInput style={ws.input} placeholder="Teléfono, email o @tapco" placeholderTextColor={C.t3} value={tfDest} onChangeText={setTfDest} />
            <Text style={ws.contactsLabel}>Contactos TapCo</Text>
            {CONTACTS.map((c, i) => (
              <TouchableOpacity key={i} style={ws.contactRow} onPress={() => setTfDest(c.id)}>
                <View style={[ws.contactAv, { backgroundColor: c.color }]}><Text style={{ color: c.tc, fontSize: 13, fontWeight: '500' }}>{c.initials}</Text></View>
                <View><Text style={ws.contactNm}>{c.name}</Text><Text style={ws.contactId}>{c.id} · TapCo</Text></View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={ws.btnPrimary} onPress={doTransfer}><Text style={ws.btnText}>Confirmar envío</Text></TouchableOpacity>
            <TouchableOpacity style={[ws.btnPrimary, ws.btnGhost]} onPress={() => setShowTransfer(false)}><Text style={ws.btnTextGhost}>Cancelar</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const ws = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.acc },
  brandName: { fontSize: 17, fontWeight: '600', color: C.t1 },
  sandboxPill: { backgroundColor: 'rgba(255,181,71,0.1)', borderWidth: 1, borderColor: 'rgba(255,181,71,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sandboxText: { fontSize: 10, color: C.warn },
  hero: { margin: 16, backgroundColor: '#0F2A1E', borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)', borderRadius: 20, padding: 20 },
  heroLabel: { fontSize: 11, color: 'rgba(0,229,160,0.6)', letterSpacing: 1 },
  heroBalance: { fontSize: 42, fontWeight: '300', color: C.acc, letterSpacing: -2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  action: { flex: 1, alignItems: 'center', gap: 5, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: C.b1, backgroundColor: C.s1 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 10, color: C.t2 },
  demoBar: { margin: 16, marginTop: 12, backgroundColor: 'rgba(255,181,71,0.06)', borderWidth: 1, borderColor: 'rgba(255,181,71,0.15)', borderRadius: 14, padding: 12 },
  demoTitle: { fontSize: 11, fontWeight: '600', color: C.warn, marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  demoBtns: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  demoBtn: { backgroundColor: C.s2, borderWidth: 1, borderColor: C.b2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  demoBtnText: { fontSize: 11, color: C.t2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  secTitle: { fontSize: 12, fontWeight: '500', color: C.t2, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6, textTransform: 'uppercase' },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.b1 },
  txnIco: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' },
  txnInf: { flex: 1 },
  txnNm: { fontSize: 13, fontWeight: '500', color: C.t1 },
  txnMt: { fontSize: 11, color: C.t2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 1 },
  txnAmt: { fontSize: 14, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  txnPos: { color: C.acc }, txnNeg: { color: C.t1 },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyIcon: { fontSize: 28, color: C.t3 },
  emptyText: { fontSize: 14, color: C.t3, textAlign: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: C.s1, borderRadius: 24, padding: 20, paddingBottom: 32 },
  modalHandle: { width: 36, height: 4, backgroundColor: C.b2, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 14 },
  input: { backgroundColor: C.s2, borderWidth: 1, borderColor: C.b2, borderRadius: 14, padding: 12, fontSize: 15, color: C.t1, marginBottom: 10 },
  contactsLabel: { fontSize: 11, color: C.t3, marginBottom: 6, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12 },
  contactAv: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  contactNm: { fontSize: 13, fontWeight: '500', color: C.t1 },
  contactId: { fontSize: 11, color: C.t2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  btnPrimary: { backgroundColor: C.acc, borderRadius: 28, padding: 16, marginTop: 12, alignItems: 'center' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.b2, marginTop: 6 },
  btnText: { fontSize: 15, fontWeight: '600', color: '#0A0A0F' },
  btnTextGhost: { fontSize: 14, color: C.t2 },
});

// ─── CARD SCREEN ──────────────────────────────────────────
export function CardScreen() {
  const [balance, setBalance] = useState(AppState.balance);
  const [revealed, setRevealed] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const CARD_NUM = '4821 3390 7701 9512';
  const CARD_EXP = '03/28';
  const CARD_HOLDER = 'COMERCIO TAPCO';

  useFocusEffect(useCallback(() => { setBalance(AppState.balance); }, []));

  return (
    <SafeAreaView style={cs.container}>
      <View style={cs.topbar}>
        <View style={cs.brand}><View style={cs.brandDot} /><Text style={cs.brandName}>TapCo</Text></View>
        <View style={cs.sandboxPill}><Text style={cs.sandboxText}>SANDBOX</Text></View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Virtual Card */}
        <View style={cs.vcard}>
          <View style={cs.vcTop}>
            <View><Text style={cs.vcBrand}>TapCo</Text><Text style={cs.vcType}>PREPAGO VIRTUAL</Text></View>
            <View style={cs.vcChip} />
          </View>
          <Text style={cs.vcNum}>{revealed ? CARD_NUM : '•••• •••• •••• ••••'}</Text>
          <View style={cs.vcBot}>
            <Text style={cs.vcHolder}>{CARD_HOLDER}</Text>
            <View>
              <Text style={cs.vcExpLbl}>VÁLIDA HASTA</Text>
              <Text style={cs.vcExp}>{revealed ? CARD_EXP : '••/••'}</Text>
            </View>
          </View>
          <Text style={cs.vcNetwork}>MC</Text>
        </View>

        {/* Details */}
        <View style={cs.details}>
          {[
            { k: 'Estado', v: frozen ? '● Congelada' : '● Activa', vc: frozen ? C.danger : C.acc },
            { k: 'Saldo disponible', v: `$${fmt(balance)}`, vc: C.acc },
            { k: 'Franquicia', v: 'Mastercard Prepago' },
            { k: 'Uso', v: 'Nacional e internacional' },
            { k: 'Emisor (sandbox)', v: 'Pomelo BIN Sponsorship' },
            { k: 'Wallet', v: 'Google Pay / Apple Pay' },
          ].map((r, i) => (
            <View key={i} style={cs.detailRow}>
              <Text style={cs.dk}>{r.k}</Text>
              <Text style={[cs.dv, r.vc && { color: r.vc }]}>{r.v}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={cs.cardActions}>
          {[
            { icon: '👁', label: revealed ? 'Ocultar' : 'Ver número', onPress: () => setRevealed(r => !r) },
            { icon: frozen ? '▶' : '❄', label: frozen ? 'Descongelar' : 'Congelar', onPress: () => { setFrozen(f => !f); Alert.alert(frozen ? '✓ Tarjeta activa' : '❄ Tarjeta congelada'); } },
            { icon: '⚙', label: 'Límites', onPress: () => Alert.alert('Límites', 'Configurable en producción') },
            { icon: '📦', label: 'Física', onPress: () => Alert.alert('Tarjeta física', 'Powered by Pomelo\nEnvío ~10 días hábiles\nDisponible en producción') },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={cs.caBtn} onPress={a.onPress}>
              <Text style={{ fontSize: 18 }}>{a.icon}</Text>
              <Text style={cs.caBtnText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={cs.physicalBanner}>
          <Text style={{ fontSize: 20 }}>📦</Text>
          <View style={{ flex: 1 }}>
            <Text style={cs.pbTitle}>Solicitar tarjeta física</Text>
            <Text style={cs.pbSub}>Mastercard embosada. Envío ~10 días. Powered by Pomelo API — disponible en producción.</Text>
          </View>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.acc },
  brandName: { fontSize: 17, fontWeight: '600', color: C.t1 },
  sandboxPill: { backgroundColor: 'rgba(255,181,71,0.1)', borderWidth: 1, borderColor: 'rgba(255,181,71,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sandboxText: { fontSize: 10, color: C.warn },
  vcard: { margin: 16, backgroundColor: '#0D2B1F', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', borderRadius: 20, padding: 20, minHeight: 180 },
  vcTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  vcBrand: { fontSize: 16, fontWeight: '600', color: C.acc },
  vcType: { fontSize: 10, color: 'rgba(0,229,160,0.5)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  vcChip: { width: 32, height: 25, backgroundColor: '#C4A44A', borderRadius: 4 },
  vcNum: { fontSize: 15, color: 'rgba(255,255,255,0.8)', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 20 },
  vcBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  vcHolder: { fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  vcExpLbl: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  vcExp: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  vcNetwork: { position: 'absolute', bottom: 18, right: 18, fontSize: 20, color: 'rgba(255,255,255,0.4)' },
  details: { marginHorizontal: 16, backgroundColor: C.s1, borderWidth: 1, borderColor: C.b1, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.b1 },
  dk: { fontSize: 13, color: C.t2 },
  dv: { fontSize: 12, color: C.t1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  caBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: C.s1, borderWidth: 1, borderColor: C.b1, borderRadius: 14, padding: 12 },
  caBtnText: { fontSize: 12, fontWeight: '500', color: C.t1 },
  physicalBanner: { marginHorizontal: 16, backgroundColor: 'rgba(0,229,160,0.05)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.15)', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10 },
  pbTitle: { fontSize: 12, fontWeight: '500', color: C.acc, marginBottom: 2 },
  pbSub: { fontSize: 11, color: C.t2, lineHeight: 16 },
});

// ─── HISTORIAL SCREEN ─────────────────────────────────────
export function HistorialScreen() {
  const [cobros, setCobros] = useState([...AppState.cobros]);
  useFocusEffect(useCallback(() => { setCobros([...AppState.cobros]); }, []));

  const total = cobros.reduce((s, t) => s + t.amt, 0);
  const avg = cobros.length > 0 ? total / cobros.length : 0;

  return (
    <SafeAreaView style={hs.container}>
      <View style={hs.header}>
        <Text style={hs.title}>Transacciones</Text>
        <Text style={hs.sub}>{cobros.length} cobros · sesión sandbox</Text>
      </View>
      <View style={hs.metrics}>
        <View style={hs.metric}><Text style={hs.mLbl}>Total cobrado</Text><Text style={hs.mVal}>${fmt(total)}</Text><Text style={hs.mSub}>{cobros.length} cobros</Text></View>
        <View style={hs.metric}><Text style={hs.mLbl}>Ticket promedio</Text><Text style={hs.mVal}>{cobros.length > 0 ? '$' + fmt(avg) : '—'}</Text><Text style={hs.mSub}>COP</Text></View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {cobros.length === 0 ? (
          <View style={hs.empty}><Text style={hs.emptyIcon}>◎</Text><Text style={hs.emptyText}>Sin transacciones aún.{'\n'}Realiza tu primer cobro.</Text></View>
        ) : (
          cobros.map((t, i) => (
            <View key={i} style={hs.row}>
              <View style={hs.ico}><Text style={{ fontSize: 16 }}>⬡</Text></View>
              <View style={hs.inf}>
                <Text style={hs.nm}>{t.card}</Text>
                <Text style={hs.mt}>{t.ts.toLocaleDateString('es-CO')} · {t.auth}{t.desc ? ' · ' + t.desc : ''}</Text>
              </View>
              <Text style={hs.amt}>+${fmt(t.amt)}</Text>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const hs = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '500', color: C.t1, marginBottom: 3 },
  sub: { fontSize: 12, color: C.t2 },
  metrics: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  metric: { flex: 1, backgroundColor: C.s1, borderWidth: 1, borderColor: C.b1, borderRadius: 14, padding: 13 },
  mLbl: { fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  mVal: { fontSize: 20, fontWeight: '300', color: C.acc, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  mSub: { fontSize: 10, color: C.t2, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.b1 },
  ico: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' },
  inf: { flex: 1 },
  nm: { fontSize: 13, fontWeight: '500', color: C.t1 },
  mt: { fontSize: 11, color: C.t2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 1 },
  amt: { fontSize: 14, fontWeight: '500', color: C.acc, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  empty: { alignItems: 'center', padding: 60, gap: 8 },
  emptyIcon: { fontSize: 28, color: C.t3 },
  emptyText: { fontSize: 14, color: C.t3, textAlign: 'center', lineHeight: 22 },
});
