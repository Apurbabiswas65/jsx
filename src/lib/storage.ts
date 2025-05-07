// src/lib/storage.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from './firebase';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload
 * @param path The storage path where the file should be stored
 * @returns Promise with the download URL
 */
export async function uploadFile(file: File, path: string): Promise<string> {
    if (!firebaseApp) {
        throw new Error('Firebase app not initialized');
    }

    const storage = getStorage(firebaseApp);
    const storageRef = ref(storage, path);

    try {
        // Upload the file
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error: any) {
        console.error('Error uploading file:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

/**
 * Uploads a logo file to Firebase Storage.
 * @param file The logo file to upload
 * @returns Promise with the logo URL
 */
export async function uploadLogo(file: File): Promise<string> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please upload an image file.');
    }

    // Generate a unique filename
    const extension = file.name.split('.').pop();
    const filename = `logos/${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;

    // Upload the file
    return uploadFile(file, filename);
}