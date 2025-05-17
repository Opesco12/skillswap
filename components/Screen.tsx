import { View, StyleSheet, StatusBar, ScrollView } from "react-native";
import { ReactNode } from "react";

interface ScreenProps {
  children: ReactNode;
  customStyles?: object;
}

const Screen = ({ children, customStyles }: ScreenProps) => {
  return (
    <View style={[styles?.container, customStyles]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1 }}>{children}</View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
  },
});

export default Screen;
