import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

const Spinner: React.FC = () => (
  <View style={styles.spinnerContainer}>
    <ActivityIndicator size="large" color="#1da1f2" />
  </View>
);

const styles = StyleSheet.create({
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Spinner;
