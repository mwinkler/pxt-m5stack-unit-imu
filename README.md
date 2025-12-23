# M5Stack Unit IMU (MPU6886) MakeCode Extension

Pure TypeScript MakeCode extension for the M5Stack Unit IMU based on the MPU6886 (6-axis accelerometer + gyroscope).

## Features
- Accelerometer (±2/4/8/16 G)
- Gyroscope (±250/500/1000/2000 DPS)
- Temperature sensor
- FIFO control and raw ADC access
- No C++ shims; uses MakeCode I2C APIs only

## Installation
Add this repository as an extension in MakeCode (Import -> Import URL).

## Quick Start
```typescript
// Initialize (uses default I2C pins of the target)


basic.forever(function () {
    const ax = m5imu.getAcceleration(m5imu.Axis.X)
    const gy = m5imu.getGyroscope(m5imu.Axis.Y)
    const t = m5imu.getTemperature()
    basic.pause(100)
})
```

## API
- `init()` – initialize the sensor
- `getAcceleration(axis: Axis)` – acceleration in G
- `getGyroscope(axis: Axis)` – angular velocity in DPS
- `getTemperature()` – temperature in °C
- `setAccelScale(scale: AccelScale)` – set accelerometer range
- `setGyroScale(scale: GyroScale)` – set gyroscope range
- `setFIFOEnable(enable: boolean)` – enable/disable FIFO
- `readFIFOCount()` – current FIFO byte count
- `resetFIFO()` – reset FIFO buffer
- `getOrientation()` – returns current orientation enum (Top/Bottom/Left/Right/Front/Back)
- `getOrientationName(orientation: Orientation)` – converts orientation to text
- `getRotation()` – returns dominant rotation axis using aviation conventions (Roll_Right/Roll_Left, Pitch_Up/Pitch_Down, Yaw_Right/Yaw_Left, None)
- `getRotationName(rotation: Rotation)` – converts rotation to text
- Raw ADC: `getAccelAdcX/Y/Z()`, `getGyroAdcX/Y/Z()`

### Enums
- `Axis`: X, Y, Z
- `AccelScale`: AFS_2G, AFS_4G, AFS_8G, AFS_16G
- `GyroScale`: GFS_250DPS, GFS_500DPS, GFS_1000DPS, GFS_2000DPS
- `Orientation`: Top, Bottom, Left, Right, Front, Back
- `Rotation`: Roll_Right, Roll_Left, Pitch_Up, Pitch_Down, Yaw_Right, Yaw_Left, None

## Notes
- Uses MakeCode I2C helpers; no native shims required.
- Default I2C pins depend on the target board configuration.

## Source Reference
- Based on the reference implementation from the M5Stack examples: https://github.com/m5stack/M5-ProductExampleCodes/tree/master/Unit/IMU_Unit

## License
MIT
