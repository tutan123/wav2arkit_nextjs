import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Global variable to keep track of the python process
let pythonProcess: any = null;

export async function POST() {
  try {
    if (pythonProcess) {
      return NextResponse.json({ success: true, message: 'Server is already running' });
    }

    const backendDir = path.join(process.cwd(), 'backend');
    const serverScript = path.join(backendDir, 'server.py');

    // Make sure you have python in your PATH and the required packages installed
    // In a real production environment, you might want to use a virtual environment
    pythonProcess = spawn('python', [serverScript], {
      cwd: backendDir,
      detached: true,
      stdio: 'ignore' // Ignore stdout/stderr to let it run in background
    });

    pythonProcess.unref(); // Allow the parent process to exit independently

    return NextResponse.json({ success: true, message: 'Backend server started' });
  } catch (error) {
    console.error('Failed to start backend server:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
