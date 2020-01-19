import auth from '@react-native-firebase/auth';
import { isStringEmpty } from '@utils/is-string-empty';
import { getErrorMessageFromFirestoreError } from '@utils/get-error-message-from-firestore-error';

export const signUp = async (email?: string, password?: string) => {
  try {
    if (isStringEmpty(email)) {
      throw new Error('Email is required.');
    }

    if (isStringEmpty(password)) {
      throw new Error('Password is required.');
    }

    await auth().createUserWithEmailAndPassword(email!, password!);
  } catch (error) {
    throw new Error(getErrorMessageFromFirestoreError(error));
  }
};
