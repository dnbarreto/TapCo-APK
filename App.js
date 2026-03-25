import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Animated, Vibration, Alert, ScrollView,
  TextInput, Modal, Platform
} from 'react-native';

// ─── NFC: usa expo-nfc si está disponible, si no → mock ───
let NfcManager, NfcTech, Ndef;
try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
  Ndef = nfc.Ndef;
} catch (e) {
  NfcManager = null;
}

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CobrarScreen from './screens/CobrarScreen';
import WalletScreen from './screens/WalletScreen';
import CardScreen from './screens/CardScreen';
import HistorialScreen from './screens/HistorialScreen';

const Tab = createBottomTabNavigator();

// ─── GLOBAL STATE (simple, sin Redux) ─────────────────────
export const AppState = {
  balance: 0,
  movements: [],
  cobros: [],
  desc: '',
  addCobro: (amt, card, auth, desc) => {
    AppState.balance += amt;
    AppState.cobros.unshift({ amt, card, auth, desc, ts: new Date() });
    AppState.movements.unshift({
      type: 'in', label: 'Cobro con tarjeta',
      sub: card, amt, ts: new Date(), icon: '⬡'
    });
  },
  addMovement: (type, label, sub, amt, icon) => {
    if (type === 'out') AppState.balance -= amt;
    else AppState.balance += amt;
    AppState.movements.unshift({ type, label, sub, amt, ts: new Date(), icon });
  }
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#00E5A0',
          tabBarInactiveTintColor: '#5A5A6E',
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color }) => {
            const icons = { Cobrar: '⬡', Billetera: '◈', Tarjeta: '◫', Historial: '≡' };
            return <Text style={{ fontSize: 20, color }}>{icons[route.name]}</Text>;
          },
        })}
      >
        <Tab.Screen name="Cobrar" component={CobrarScreen} />
        <Tab.Screen name="Billetera" component={WalletScreen} />
        <Tab.Screen name="Tarjeta" component={CardScreen} />
        <Tab.Screen name="Historial" component={HistorialScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0A0A0F',
    borderTopColor: 'rgba(255,255,255,0.07)',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 6,
    height: 68,
  },
  tabLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
});
