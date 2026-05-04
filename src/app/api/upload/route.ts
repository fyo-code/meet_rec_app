import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Authenticate the user here when NextAuth is fully integrated
        // For now, we allow the upload as long as it's an audio file
        return {
          allowedContentTypes: ['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-m4a'],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB maximum for long meetings
          tokenPayload: JSON.stringify({
            // optional additional data
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This is called AFTER the file is successfully uploaded to Vercel Blob
        // In a database-backed app, we would save the URL to the user's account here
        console.log('Audio file successfully uploaded to Vercel Blob:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error('Vercel Blob upload error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }, // The webhook will retry 5 times waiting for a 200
    );
  }
}
