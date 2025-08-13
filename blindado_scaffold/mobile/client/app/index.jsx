import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Blindado — Cliente</Text>
      <Link href="/quote" style={s.link}>Nueva Reserva</Link>
      <Link href="/bookings" style={s.link}>Mis Reservas</Link>
      <StatusBar style="light" />
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#0B0B0F' },
  title: { color:'#fff', fontSize:24, marginBottom:20 },
  link: { color:'#9bd', fontSize:18, marginVertical:8 }
});
