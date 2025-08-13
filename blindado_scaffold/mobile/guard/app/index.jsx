import { Link } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Blindado — Guardia</Text>
      <Link href="/jobs" style={s.link}>Trabajos Ofrecidos</Link>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#0B0B0F' },
  title: { color:'#fff', fontSize:24, marginBottom:20 },
  link: { color:'#9bd', fontSize:18 }
});
