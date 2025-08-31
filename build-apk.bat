@echo off
echo ========================================
echo    AttendFlow APK Builder
echo ========================================
echo.

echo Checking Java version...
java -version 2>&1 | findstr "version"
echo.

echo Checking if Android SDK is available...
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Android SDK not found in PATH
    echo.
    echo Please install Android Studio or set ANDROID_HOME
    echo Download from: https://developer.android.com/studio
    echo.
    pause
    exit /b 1
)

echo ✅ Android SDK found
echo.

echo Building web app...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Web app build failed
    pause
    exit /b 1
)

echo ✅ Web app built successfully
echo.

echo Syncing with Capacitor...
call npx cap sync
if %errorlevel% neq 0 (
    echo ❌ Capacitor sync failed
    pause
    exit /b 1
)

echo ✅ Capacitor sync completed
echo.

echo Building Android APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo ❌ APK build failed
    echo.
    echo This might be due to Java version issues.
    echo Please install Java 17 or 21 for Android development.
    echo.
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ========================================
echo    ✅ APK Build Successful!
echo ========================================
echo.
echo 📱 APK Location: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 📋 Next Steps:
echo 1. Transfer the APK to your Android device
echo 2. Enable "Unknown Sources" in device settings
echo 3. Install the APK by tapping on it
echo 4. Launch AttendFlow from your home screen
echo.
pause
