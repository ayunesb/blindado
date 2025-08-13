import { View, Text, StyleSheet } from 'react-native';

export default function Bookings() {
  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Reservas</Text>
      <Text style={s.p}>Próximamente: listado de reservas desde la API.</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap:{ flex:1, padding:20, backgroundColor:'#0B0B0F' },
  h1:{ color:'#fff', fontSize:22, marginBottom:12 },
  p:{ color:'#aaa' }
});
