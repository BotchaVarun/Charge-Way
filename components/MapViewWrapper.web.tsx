import { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

const NullComponent = forwardRef((props: any, ref: any) => {
  return <View ref={ref} style={[StyleSheet.absoluteFill, props.style]} {...props} />;
});

NullComponent.displayName = 'NullComponent';

export const Marker = (props: any) => null;
export const Polyline = (props: any) => null;
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export default NullComponent;
