m5imu.onRotationChanged(function (rotation) {
    serial.writeLine(m5imu.getRotationName(rotation))
})
m5imu.onOrientationChanged(function (orientation) {
    serial.writeLine(m5imu.getOrientationName(orientation))
})
m5imu.init()
