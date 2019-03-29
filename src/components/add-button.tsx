import React from 'react'
import { StyleSheet, TouchableHighlight } from 'react-native'
import { PlusIcon } from '@components/svg/plus-icon'

type Props = {
  onPress: () => void
  testID?: string
  children?: never
}

const AddButton = ({ onPress, testID }: Props) => (
  <TouchableHighlight
    style={styles.addButton}
    onPress={onPress}
    underlayColor="transparent"
    testID={testID}
  >
    <PlusIcon />
  </TouchableHighlight>
)

type Style = {
  addButton: import('react-native').ViewStyle
}

const styles = StyleSheet.create<Style>({
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
})

export { AddButton }
