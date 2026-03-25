import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Animated, Vibration, Alert, ScrollView, Platform
} from 'react-native';
import { AppState } from '../App';

// ─── NFC Manager (graceful fallback) ──────────────────────
let NfcManager, NfcTech;
try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
  NfcManager.start();
} catch (e) { NfcManager = null; }

const C = {
  bg: '#0A0A0F', s1: '#13131A', s2: '#1C1C26',
  b1: 'rgba(255,255,255,0.07)', b2: 'rgba(255,255,255,0.12)',
  acc: '#00E5A0', warn: '#FFB547', danger: '#FF5B5B',
  t1: '#F0F0F5', t2: '#8888A0', t3: '#5A5A6E',
};

const fmt = n => new Intl.NumberFormat('es-CO').format(Math.round(n));
const randAuth = () => Math.random().toString(36).substr(2, 8).toUpperCase();
const CARDS = ['•••• 4821 (Visa Débito)', '•••• 3390 (MC Crédito)', '•••• 7701 (Amex)', '•••• 9512 (Visa)'];

// ─── SCREENS dentro de Cobrar ─────────────────────────────
const SCREEN = { KEYPAD: 'keypad', NFC: 'nfc', PROC: 'proc', RESULT: 'result' };

export default function CobrarScreen() {
  const [screen, setScreen] = useState(SCREEN.KEYPAD);
  const [raw, setRaw] = useState('');
  const [desc, setDesc] = useState('');
  const [approved, setApproved] = useState(true);
  const [nfcReal, setNfcReal] = useState(false); // ¿se detectó NFC real?
  const [nfcTag, setNfcTag] = useState(null);
  const [procStep, setProcStep] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [nfcSupported, setNfcSupported] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const procAnim = useRef(new Animated.Value(0)).current;

  const amount = parseInt(raw || '0', 10);

  // ─── Check NFC support ──────────────────────────────────
  useEffect(() => {
    checkNFC();
    return () => { cancelNFC(); };
  }, []);

  async function checkNFC() {
    if (!NfcManager) return;
    try {
      const supported = await NfcManager.isSupported();
      const enabled = await NfcManager.isEnabled();
      setNfcSupported(supported && enabled);
    } catch (e) { setNfcSupported(false); }
  }

  // ─── Pulse animation para radar ─────────────────────────
  useEffect(() => {
    if (screen === SCREEN.NFC) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [screen]);

  // ─── KEYPAD LOGIC ────────────────────────────────────────
  function kp(k) {
    if (raw.length >= 10) return;
    const next = raw + k;
    if (parseInt(next, 10) > 9999999999) return;
    setRaw(next);
  }
  function kpDel() { setRaw(r => r.slice(0, -1)); }

  function goNFC() {
    setScreen(SCREEN.NFC);
    if (nfcSupported) startNFCRead();
  }

  // ─── NFC REAL: leer UID de tarjeta ───────────────────────
  async function startNFCRead() {
    if (!NfcManager || !nfcSupported) return;
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (tag) {
        setNfcTag(tag);
        setNfcReal(true);
        Vibration.vibrate([0, 100, 50, 100]); // haptic feedback
        await NfcManager.cancelTechnologyRequest();
        // Detectó tag real → proceder con mock de autorización
        handleTap(true, tag?.id || 'REAL_TAG');
      }
    } catch (e) {
      // Usuario canceló o error → no hacer nada
      await NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }

  async function cancelNFC() {
    if (!NfcManager) return;
    try { await NfcManager.cancelTechnologyRequest(); } catch (e) {}
  }

  // ─── PROCESAR PAGO (mock autorización) ──────────────────
  function handleTap(approv, tagInfo = null) {
    setApproved(approv);
    setScreen(SCREEN.PROC);
    setProcStep(0);

    const steps = [0, 1, 2, 3, 4];
    steps.forEach((s, i) => {
      setTimeout(() => {
        setProcStep(s + 1);
        if (s === steps.length - 1) {
          setTimeout(() => finishProc(approv, tagInfo), 400);
        }
      }, i * 700);
    });
  }

  function finishProc(approv, tagInfo) {
    const amt = amount;
    const auth = randAuth();
    const card = tagInfo && tagInfo !== 'mock'
      ? `NFC Real · UID:${String(tagInfo).slice(-8)}` // muestra parte del UID real
      : CARDS[Math.floor(Math.random() * CARDS.length)];
    const now = new Date();

    if (approv) {
      AppState.addCobro(amt, card, auth, desc);
    }

    setResultData({ amt, auth, card, now, approv, isRealNFC: tagInfo && tagInfo !== 'mock' });
    setScreen(SCREEN.RESULT);
  }

  function newCharge() {
    setRaw(''); setDesc(''); setNfcReal(false); setNfcTag(null);
    setProcStep(0); setResultData(null);
    setScreen(SCREEN.KEYPAD);
  }

  // ─── RENDER ──────────────────────────────────────────────
  if (screen === SCREEN.KEYPAD) return <KeypadView amount={amount} raw={raw} desc={desc} setDesc={setDesc} kp={kp} kpDel={kpDel} goNFC={goNFC} nfcSupported={nfcSupported} />;
  if (screen === SCREEN.NFC) return <NFCView amount={amount} nfcSupported={nfcSupported} pulseAnim={pulseAnim} onSimApprove={() => handleTap(true, 'mock')} onSimReject={() => handleTap(false, 'mock')} onCancel={() => { cancelNFC(); setScreen(SCREEN.KEYPAD); }} />;
  if (screen === SCREEN.PROC) return <ProcView step={procStep} />;
  if (screen === SCREEN.RESULT) return <ResultView data={resultData} onNew={newCharge} onRetry={() => { setScreen(SCREEN.NFC); if (nfcSupported) startNFCRead(); }} />;
  return null;
}

// ─── KEYPAD VIEW ─────────────────────────────────────────
function KeypadView({ amount, raw, desc, setDesc, kp, kpDel, goNFC, nfcSupported }) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.topbar}>
        <View style={s.brand}><View style={s.brandDot} /><Text style={s.brandName}>TapCo</Text></View>
        <View style={s.sandboxPill}><Text style={s.sandboxText}>SANDBOX</Text></View>
      </View>

      <View style={s.amtZone}>
        <Text style={s.amtLabel}>MONTO A COBRAR</Text>
        <View style={s.amtRow}>
          <Text style={s.amtCur}>COP</Text>
          <Text style={[s.amtNum, amount > 0 && s.amtNumActive]}>{fmt(amount)}</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.prompt('Descripción', '', setDesc)}>
          <Text style={s.amtDesc}>{desc || '+ Agregar descripción'}</Text>
        </TouchableOpacity>
        {nfcSupported && (
          <View style={s.nfcBadge}><Text style={s.nfcBadgeText}>● NFC listo</Text></View>
        )}
      </View>

      <View style={s.keypad}>
        {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map((k, i) => (
          <TouchableOpacity key={i} style={s.key} onPress={() => k === '⌫' ? kpDel() : kp(k)} activeOpacity={0.7}>
            <Text style={[s.keyText, (k === '000' || k === '⌫') && s.keyTextSm]}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[s.btnPrimary, amount < 1000 && s.btnDisabled]} onPress={goNFC} disabled={amount < 1000}>
        <Text style={[s.btnText, amount < 1000 && s.btnTextDisabled]}>⬡  Cobrar con tarjeta NFC</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── NFC VIEW ────────────────────────────────────────────
function NFCView({ amount, nfcSupported, pulseAnim, onSimApprove, onSimReject, onCancel }) {
  const ring1 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const ring2 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] });
  const ring3 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.25] });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topbar}>
        <View style={s.brand}><View style={s.brandDot} /><Text style={s.brandName}>TapCo</Text></View>
        <View style={s.sandboxPill}><Text style={s.sandboxText}>SANDBOX</Text></View>
      </View>
      <View style={s.nfcZone}>
        <View style={s.nfcAmtChip}><Text style={s.nfcAmtText}>${fmt(amount)}</Text></View>

        <View style={s.radar}>
          <Animated.View style={[s.ring, s.ring3, { opacity: ring3 }]} />
          <Animated.View style={[s.ring, s.ring2, { opacity: ring2 }]} />
          <Animated.View style={[s.ring, s.ring1, { opacity: ring1 }]} />
          <View style={s.nfcCardIcon}><View style={s.nfcChip} /></View>
        </View>

        <View style={s.nfcInst}>
          <Text style={s.nfcInstTitle}>
            {nfcSupported ? 'Acerca la tarjeta al teléfono' : 'NFC no disponible en este dispositivo'}
          </Text>
          <Text style={s.nfcInstSub}>
            {nfcSupported
              ? 'Esperando tarjeta NFC...\nDébito, crédito, Apple Pay o Google Pay'
              : 'Usa los botones de simulación abajo'}
          </Text>
        </View>

        {nfcSupported && (
          <View style={s.nfcRealBadge}>
            <Text style={s.nfcRealText}>● NFC activo — pon la tarjeta en la parte trasera del celular</Text>
          </View>
        )}

        <View style={s.nfcButtons}>
          <TouchableOpacity style={s.btnPrimary} onPress={onSimApprove}>
            <Text style={s.btnText}>✓  Simular aprobación (mock)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, s.btnGhost]} onPress={onSimReject}>
            <Text style={[s.btnText, s.btnTextGhost]}>✗  Simular rechazo (mock)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, s.btnGhost]} onPress={onCancel}>
            <Text style={[s.btnText, s.btnTextGhost]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── PROCESSING VIEW ─────────────────────────────────────
function ProcView({ step }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })).start();
  }, []);
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const steps = ['NFC: leer token EMV', 'Tokenizar datos tarjeta', 'Autorizar con procesador', 'Validar con emisor', 'Acreditar a billetera'];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.procZone}>
        <Animated.View style={[s.spinner, { transform: [{ rotate: spin }] }]} />
        <Text style={s.procTitle}>Procesando pago</Text>
        <Text style={s.procSub}>{steps[Math.min(step, steps.length - 1)] || 'Iniciando...'}</Text>
        <View style={s.procSteps}>
          {steps.map((st, i) => (
            <View key={i} style={[s.ps, step > i && s.psDone, step === i && s.psAct]}>
              <View style={[s.psDot, step > i && s.psDotDone, step === i && s.psDotAct]} />
              <Text style={[s.psText, step > i && s.psTextDone]}>{st}</Text>
              <View style={s.mockTag}><Text style={s.mockTagText}>mock</Text></View>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── RESULT VIEW ─────────────────────────────────────────
function ResultView({ data, onNew, onRetry }) {
  if (!data) return null;
  const { amt, auth, card, now, approv, isRealNFC } = data;
  const ts = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ds = now.toLocaleDateString('es-CO');

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.resZone}>
        <View style={[s.checkCircle, !approv && s.checkCircleErr]}>
          <Text style={{ fontSize: 28 }}>{approv ? '✓' : '✗'}</Text>
        </View>
        <Text style={[s.resTitle, !approv && { color: C.danger }]}>
          {approv ? 'Pago aprobado' : 'Pago rechazado'}
        </Text>
        <Text style={[s.resAmt, !approv && { color: C.danger }]}>${fmt(amt)}</Text>

        {isRealNFC && (
          <View style={s.realNfcBadge}>
            <Text style={s.realNfcText}>⬡ Tarjeta NFC detectada físicamente</Text>
          </View>
        )}

        <View style={s.receipt}>
          {approv ? (
            <>
              <ReceiptRow k="Tarjeta" v={card} />
              <ReceiptRow k="Auth" v={auth} accent />
              <ReceiptRow k="Fecha" v={`${ds} ${ts}`} />
              <ReceiptRow k="→ Billetera TapCo" v={`+$${fmt(amt)}`} accent />
            </>
          ) : (
            <>
              <ReceiptRow k="Código" v="05 — DO NOT HONOR" danger />
              <ReceiptRow k="Motivo" v="Fondos insuficientes (mock)" />
              <ReceiptRow k="Tarjeta" v={card} />
            </>
          )}
        </View>

        <View style={s.mockBanner}>
          <Text style={s.mockBannerText}>⚠ SANDBOX · transacción simulada — no se procesó dinero real</Text>
        </View>

        <TouchableOpacity style={s.btnPrimary} onPress={onNew}>
          <Text style={s.btnText}>Nuevo cobro</Text>
        </TouchableOpacity>
        {!approv && (
          <TouchableOpacity style={[s.btnPrimary, s.btnGhost, { marginTop: 8 }]} onPress={onRetry}>
            <Text style={[s.btnText, s.btnTextGhost]}>Intentar de nuevo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReceiptRow({ k, v, accent, danger }) {
  return (
    <View style={s.rr}>
      <Text style={s.rk}>{k}</Text>
      <Text style={[s.rv, accent && s.rvAcc, danger && { color: C.danger }]}>{v}</Text>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.acc },
  brandName: { fontSize: 17, fontWeight: '600', color: C.t1, letterSpacing: -0.3 },
  sandboxPill: { backgroundColor: 'rgba(255,181,71,0.1)', borderWidth: 1, borderColor: 'rgba(255,181,71,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sandboxText: { fontSize: 10, color: C.warn, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  amtZone: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 4 },
  amtLabel: { fontSize: 11, color: C.t3, letterSpacing: 1 },
  amtRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  amtCur: { fontSize: 22, fontWeight: '300', color: C.t2, marginTop: 10 },
  amtNum: { fontSize: 56, fontWeight: '300', color: C.t1, letterSpacing: -2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  amtNumActive: { color: C.acc },
  amtDesc: { fontSize: 12, color: C.t3, borderBottomWidth: 1, borderBottomColor: C.t3, paddingBottom: 1, marginTop: 4 },
  nfcBadge: { marginTop: 10, backgroundColor: 'rgba(0,229,160,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)' },
  nfcBadgeText: { fontSize: 11, color: C.acc },

  keypad: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 6 },
  key: { width: '31%', backgroundColor: C.s1, borderWidth: 1, borderColor: C.b1, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 21, color: C.t1, fontWeight: '400' },
  keyTextSm: { fontSize: 13, color: C.t2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  btnPrimary: { backgroundColor: C.acc, borderRadius: 28, padding: 17, marginHorizontal: 16, marginBottom: 8, alignItems: 'center' },
  btnDisabled: { backgroundColor: C.s2 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.b2 },
  btnText: { fontSize: 15, fontWeight: '600', color: '#0A0A0F' },
  btnTextDisabled: { color: C.t3 },
  btnTextGhost: { color: C.t2, fontWeight: '400' },

  nfcZone: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 },
  nfcAmtChip: { backgroundColor: C.s2, borderWidth: 1, borderColor: C.b2, borderRadius: 20, paddingHorizontal: 26, paddingVertical: 10 },
  nfcAmtText: { fontSize: 30, fontWeight: '300', color: C.acc, letterSpacing: -1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  radar: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 200, borderWidth: 1.5, borderColor: C.acc },
  ring1: { width: 80, height: 80 },
  ring2: { width: 110, height: 110 },
  ring3: { width: 140, height: 140 },
  nfcCardIcon: { width: 52, height: 36, backgroundColor: C.s2, borderWidth: 1.5, borderColor: C.b2, borderRadius: 8, justifyContent: 'center' },
  nfcChip: { width: 18, height: 14, backgroundColor: '#C4A44A', borderRadius: 3, marginLeft: 9 },
  nfcInst: { alignItems: 'center', gap: 4 },
  nfcInstTitle: { fontSize: 16, fontWeight: '500', color: C.t1, textAlign: 'center' },
  nfcInstSub: { fontSize: 12, color: C.t2, textAlign: 'center', lineHeight: 18 },
  nfcRealBadge: { backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)' },
  nfcRealText: { fontSize: 11, color: C.acc, textAlign: 'center' },
  nfcButtons: { width: '100%', gap: 8 },

  procZone: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 },
  spinner: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: C.s2, borderTopColor: C.acc },
  procTitle: { fontSize: 17, fontWeight: '500', color: C.t1 },
  procSub: { fontSize: 13, color: C.t2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  procSteps: { width: '100%', gap: 6 },
  ps: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: C.s1, borderRadius: 10, borderWidth: 1, borderColor: C.b1 },
  psDone: { borderColor: 'rgba(0,229,160,0.2)', backgroundColor: 'rgba(0,229,160,0.04)' },
  psAct: { borderColor: C.b2 },
  psDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.t3 },
  psDotDone: { backgroundColor: C.acc },
  psDotAct: { backgroundColor: C.warn },
  psText: { flex: 1, fontSize: 12, color: C.t3, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  psTextDone: { color: C.acc },
  mockTag: { backgroundColor: 'rgba(255,181,71,0.08)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  mockTagText: { fontSize: 10, color: C.warn, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  resZone: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 13 },
  checkCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(0,229,160,0.1)', borderWidth: 1.5, borderColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  checkCircleErr: { backgroundColor: 'rgba(255,91,91,0.1)', borderColor: C.danger },
  resTitle: { fontSize: 21, fontWeight: '500', color: C.t1 },
  resAmt: { fontSize: 42, fontWeight: '300', color: C.acc, letterSpacing: -2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  realNfcBadge: { backgroundColor: 'rgba(0,229,160,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)' },
  realNfcText: { fontSize: 12, color: C.acc },
  receipt: { width: '100%', backgroundColor: C.s1, borderWidth: 1, borderColor: C.b1, borderRadius: 20, overflow: 'hidden' },
  rr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.b1 },
  rk: { fontSize: 13, color: C.t2 },
  rv: { fontSize: 12, color: C.t1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  rvAcc: { color: C.acc },
  mockBanner: { width: '100%', backgroundColor: 'rgba(255,181,71,0.07)', borderWidth: 1, borderColor: 'rgba(255,181,71,0.2)', borderRadius: 12, padding: 12 },
  mockBannerText: { fontSize: 11, color: C.warn, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', textAlign: 'center' },
});
