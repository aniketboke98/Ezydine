import React from 'react';
import { View, Image, StyleSheet, DimensionValue } from 'react-native';

interface EzyDineLogoProps {
  width?: number;
  height?: number;
  onDark?: boolean;
  style?: any;
}

export const EzyDineLogo: React.FC<EzyDineLogoProps> = ({
  width = 180,
  height,
  onDark = false,
  style,
}) => {
  // Logo aspect ratio is 1024 / 341 ~ 3:1
  const calculatedHeight = height || width / 3;

  const content = (
    <Image
      source={require('../../assets/ezydine-logo.png')}
      style={[
        styles.logoImage,
        {
          width: width as DimensionValue,
          height: calculatedHeight,
        },
      ]}
      resizeMode="contain"
    />
  );

  if (onDark) {
    return (
      <View style={[styles.darkWrapper, style]}>
        {content}
      </View>
    );
  }

  return <View style={[styles.container, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    alignSelf: 'center',
  },
  darkWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
});
