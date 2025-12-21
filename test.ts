// Test code for M5Stack Unit IMU (6886)

// Initialize the IMU sensor
m5imu.init(21, 22)

// Configure ranges (optional)
m5imu.setAccelScale(m5imu.AccelScale.AFS_8G)
m5imu.setGyroScale(m5imu.GyroScale.GFS_2000DPS)

basic.forever(function () {
    // Test accelerometer readings
    let accelX = m5imu.getAcceleration(m5imu.Axis.X)
    let accelY = m5imu.getAcceleration(m5imu.Axis.Y)
    let accelZ = m5imu.getAcceleration(m5imu.Axis.Z)
    
    // Test gyroscope readings
    let gyroX = m5imu.getGyroscope(m5imu.Axis.X)
    let gyroY = m5imu.getGyroscope(m5imu.Axis.Y)
    let gyroZ = m5imu.getGyroscope(m5imu.Axis.Z)
    
    // Test temperature reading
    let temp = m5imu.getTemperature()
    
    // Display results
    serial.writeLine("Accel X: " + accelX + " G")
    serial.writeLine("Accel Y: " + accelY + " G")
    serial.writeLine("Accel Z: " + accelZ + " G")
    serial.writeLine("Gyro X: " + gyroX + " DPS")
    serial.writeLine("Gyro Y: " + gyroY + " DPS")
    serial.writeLine("Gyro Z: " + gyroZ + " DPS")
    serial.writeLine("Temperature: " + temp + " °C")
    serial.writeLine("---")
    
    basic.pause(500)
})
