import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import CobrarScreen from './screens/CobrarScreen';
import { WalletScreen, CardScreen, HistorialScreen } from './screens/WalletCardHistScreen';

const Tab = createBottomTabNavigator();

export const AppState = {
  balance: 0,
  movements: [],
  cobros: [],
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
          tabBarStyle: {
            backgroundColor: '#0A0A0F',
            borderTopColor: 'rgba(255,255,255,0.07)',
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 6,
            height: 68,
          },
          tabBarActiveTintColor: '#00E5A0',
          tabBarInactiveTintColor: '#5A5A6E',
          tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
          tabBarIcon: ({ color }) => {
            const icons = {
              Cobrar: '⬡',
              Billetera: '◈',
              Tarjeta: '◫',
              Historial: '≡'
            };
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
