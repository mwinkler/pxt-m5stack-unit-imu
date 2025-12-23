/**
 * MakeCode extension for M5Stack Unit IMU (6886)
 * 6-axis IMU sensor with accelerometer and gyroscope
 */

//% color=#0079B9 icon="\uf1b2" block="M5 IMU"
//% groups=['Accelerometer', 'Gyroscope', 'Temperature', 'Advanced']
namespace m5imu {
    
    // I2C address and register definitions
    const IMU_ADDRESS = 0x68
    const IMU_WHOAMI = 0x75
    const IMU_SMPLRT_DIV = 0x19
    const IMU_CONFIG = 0x1A
    const IMU_GYRO_CONFIG = 0x1B
    const IMU_ACCEL_CONFIG = 0x1C
    const IMU_ACCEL_CONFIG2 = 0x1D
    const IMU_INT_PIN_CFG = 0x37
    const IMU_INT_ENABLE = 0x38
    const IMU_ACCEL_XOUT_H = 0x3B
    const IMU_TEMP_OUT_H = 0x41
    const IMU_GYRO_XOUT_H = 0x43
    const IMU_USER_CTRL = 0x6A
    const IMU_PWR_MGMT_1 = 0x6B
    const IMU_PWR_MGMT_2 = 0x6C
    const IMU_FIFO_EN = 0x23
    const IMU_FIFO_COUNT = 0x72
    const IMU_FIFO_R_W = 0x74
    
    /**
     * Accelerometer scale options
     */
    export enum AccelScale {
        //% block="±2G"
        AFS_2G = 0,
        //% block="±4G"
        AFS_4G = 1,
        //% block="±8G"
        AFS_8G = 2,
        //% block="±16G"
        AFS_16G = 3
    }

    /**
     * Gyroscope scale options
     */
    export enum GyroScale {
        //% block="±250 DPS"
        GFS_250DPS = 0,
        //% block="±500 DPS"
        GFS_500DPS = 1,
        //% block="±1000 DPS"
        GFS_1000DPS = 2,
        //% block="±2000 DPS"
        GFS_2000DPS = 3
    }

    /**
     * Axis selection
     */
    export enum Axis {
        //% block="X"
        X = 0,
        //% block="Y"
        Y = 1,
        //% block="Z"
        Z = 2
    }

    /**
     * Enum for device orientation derived from acceleration
     */
    export enum Orientation {
        Top = 0,
        Bottom = 1,
        Left = 2,
        Right = 3,
        Front = 4,
        Back = 5
    }

    /**
     * Enum for device rotation derived from gyroscope
     */
    export enum Rotation {
        Roll_Right = 0,
        Roll_Left = 1,
        Pitch_Up = 2,
        Pitch_Down = 3,
        Yaw_Right = 4,
        Yaw_Left = 5,
        None = 6
    }

    let initialized = false
    let aRes = 8.0 / 32768.0  // Default ±8G
    let gRes = 2000.0 / 32768.0  // Default ±2000 DPS
    let currentAccelScale = AccelScale.AFS_8G
    let currentGyroScale = GyroScale.GFS_2000DPS
    let lastOrientation: Orientation = null
    let orientationEventId = 3100
    let orientationMonitorStarted = false
    let lastRotation: Rotation = null
    let rotationEventId = 3101
    let rotationMonitorStarted = false
    
    // Helper functions for I2C communication
    function writeReg(reg: number, value: number): void {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(IMU_ADDRESS, buf)
    }
    
    function readReg(reg: number): number {
        pins.i2cWriteNumber(IMU_ADDRESS, reg, NumberFormat.UInt8BE)
        return pins.i2cReadNumber(IMU_ADDRESS, NumberFormat.UInt8BE)
    }
    
    function readRegs(reg: number, count: number): Buffer {
        pins.i2cWriteNumber(IMU_ADDRESS, reg, NumberFormat.UInt8BE)
        return pins.i2cReadBuffer(IMU_ADDRESS, count)
    }
    
    function updateAres(): void {
        switch (currentAccelScale) {
            case AccelScale.AFS_2G:
                aRes = 2.0 / 32768.0
                break
            case AccelScale.AFS_4G:
                aRes = 4.0 / 32768.0
                break
            case AccelScale.AFS_8G:
                aRes = 8.0 / 32768.0
                break
            case AccelScale.AFS_16G:
                aRes = 16.0 / 32768.0
                break
        }
    }
    
    function updateGres(): void {
        switch (currentGyroScale) {
            case GyroScale.GFS_250DPS:
                gRes = 250.0 / 32768.0
                break
            case GyroScale.GFS_500DPS:
                gRes = 500.0 / 32768.0
                break
            case GyroScale.GFS_1000DPS:
                gRes = 1000.0 / 32768.0
                break
            case GyroScale.GFS_2000DPS:
                gRes = 2000.0 / 32768.0
                break
        }
    }

    /**
     * Initialize the IMU sensor
     */
    //% blockId=m5imu_init block="initialize IMU sensor"
    //% weight=100
    export function init(): void {
        if (initialized) return
        
        basic.pause(10)
        
        // Check WHO_AM_I register
        let whoAmI = readReg(IMU_WHOAMI)
        
        // Reset device
        writeReg(IMU_PWR_MGMT_1, 0x00)
        basic.pause(10)
        
        writeReg(IMU_PWR_MGMT_1, 0x80)
        basic.pause(10)
        
        writeReg(IMU_PWR_MGMT_1, 0x01)
        basic.pause(10)
        
        // Configure accelerometer (±8G)
        writeReg(IMU_ACCEL_CONFIG, 0x10)
        basic.pause(1)
        
        // Configure gyroscope (±2000 DPS)
        writeReg(IMU_GYRO_CONFIG, 0x18)
        basic.pause(1)
        
        // 1kHz output
        writeReg(IMU_CONFIG, 0x01)
        basic.pause(1)
        
        // 2 div, FIFO 500Hz out
        writeReg(IMU_SMPLRT_DIV, 0x01)
        basic.pause(1)
        
        writeReg(IMU_INT_ENABLE, 0x00)
        basic.pause(1)
        
        writeReg(IMU_ACCEL_CONFIG2, 0x00)
        basic.pause(1)
        
        writeReg(IMU_USER_CTRL, 0x00)
        basic.pause(1)
        
        writeReg(IMU_FIFO_EN, 0x00)
        basic.pause(1)
        
        writeReg(IMU_INT_PIN_CFG, 0x22)
        basic.pause(1)
        
        writeReg(IMU_INT_ENABLE, 0x01)
        basic.pause(10)
        
        updateAres()
        updateGres()
        initialized = true
    }

    export function getAccelerationXYZ(): {x: number, y: number, z: number} {
        if (!initialized) init()
        
        let buf = readRegs(IMU_ACCEL_XOUT_H, 6)
        let x = (buf[0] << 8) | buf[1]
        let y = (buf[2] << 8) | buf[3]
        let z = (buf[4] << 8) | buf[5]
        
        // Convert to signed 16-bit
        if (x > 32767) x -= 65536
        if (y > 32767) y -= 65536
        if (z > 32767) z -= 65536
        
        return {x: x * aRes, y: y * aRes, z: z * aRes}
    }

    /**
     * Determine orientation based on current acceleration
     */
    //% blockId=m5imu_orientation block="orientation"
    //% weight=85
    //% group="Accelerometer"
    export function getOrientation(): Orientation {
        const a = getAccelerationXYZ()
        const ax = Math.abs(a.x)
        const ay = Math.abs(a.y)
        const az = Math.abs(a.z)

        if (ax >= ay && ax >= az) {
            return a.x >= 0 ? Orientation.Right : Orientation.Left
        }
        if (ay >= ax && ay >= az) {
            return a.y >= 0 ? Orientation.Front : Orientation.Back
        }
        return a.z >= 0 ? Orientation.Top : Orientation.Bottom
    }

    /**
     * Determine dominant rotation based on current gyroscope
     */
    //% blockId=m5imu_rotation block="rotation"
    //% weight=79
    //% group="Gyroscope"
    export function getRotation(): Rotation {
        const g = getGyroscopeXYZ()
        const gx = Math.abs(g.x)
        const gy = Math.abs(g.y)
        const gz = Math.abs(g.z)

        // Threshold for detecting rotation (DPS)
        const threshold = 20
        if (gx < threshold && gy < threshold && gz < threshold) {
            return Rotation.None
        }

        if (gx >= gy && gx >= gz) {
            return g.x >= 0 ? Rotation.Pitch_Up : Rotation.Pitch_Down
        }
        if (gy >= gx && gy >= gz) {
            return g.y >= 0 ? Rotation.Roll_Right : Rotation.Roll_Left
        }
        return g.z >= 0 ? Rotation.Yaw_Left : Rotation.Yaw_Right
    }

    /**
     * Convert rotation to a string label
     */
    //% blockId=m5imu_rotation_name block="rotation name %rotation"
    //% rotation.shadow="m5imu_rotation"
    //% weight=78
    //% group="Gyroscope"
    //% advanced=true
    export function getRotationName(rotation: number): string {
        switch (rotation) {
            case Rotation.Roll_Right: return "roll right"
            case Rotation.Roll_Left: return "roll left"
            case Rotation.Pitch_Up: return "pitch up"
            case Rotation.Pitch_Down: return "pitch down"
            case Rotation.Yaw_Right: return "yaw right"
            case Rotation.Yaw_Left: return "yaw left"
            case Rotation.None: return "none"
            default: return "unknown"
        }
    }

    /**
     * Convert orientation to a string label
     */
    //% blockId=m5imu_orientation_name block="orientation name %orientation"
    //% orientation.shadow="m5imu_orientation"
    //% weight=84
    //% group="Accelerometer"
    //% advanced=true
    export function getOrientationName(orientation: number): string {
        switch (orientation) {
            case Orientation.Top: return "top"
            case Orientation.Bottom: return "bottom"
            case Orientation.Left: return "left"
            case Orientation.Right: return "right"
            case Orientation.Front: return "front"
            case Orientation.Back: return "back"
            default: return "unknown"
        }
    }

    /**
     * Check if orientation matches a specific value
     */
    //% blockId=m5imu_is_orientation 
    //% block="%value|is %orientation"
    //% value.shadow="m5imu_orientation"
    //% weight=83.5
    //% group="Accelerometer"
    export function isOrientation(value: number, orientation: Orientation): boolean {
        return value === orientation
    }

    /**
     * Register code to run when orientation changes
     */
    //% blockId=m5imu_on_orientation_change 
    //% block="on orientation changed"
    //% weight=83
    //% group="Accelerometer"
    //% draggableParameters
    export function onOrientationChanged(handler: (orientation: Orientation) => void): void {
        control.onEvent(orientationEventId, EventBusValue.MICROBIT_EVT_ANY, () => {
            handler(lastOrientation)
        })
        
        if (!orientationMonitorStarted) {
            orientationMonitorStarted = true
            control.inBackground(() => {
                while (true) {
                    const current = getOrientation()
                    if (current !== lastOrientation && lastOrientation !== null) {
                        lastOrientation = current
                        control.raiseEvent(orientationEventId, current)
                    } 
                    lastOrientation = current
                    basic.pause(100)
                }
            })
        }
    }

    /**
     * Register code to run when rotation changes
     */
    //% blockId=m5imu_on_rotation_change 
    //% block="on rotation changed"
    //% weight=77
    //% group="Gyroscope"
    //% draggableParameters
    export function onRotationChanged(handler: (rotation: Rotation) => void): void {
        control.onEvent(rotationEventId, EventBusValue.MICROBIT_EVT_ANY, () => {
            handler(lastRotation)
        })
        
        if (!rotationMonitorStarted) {
            rotationMonitorStarted = true
            control.inBackground(() => {
                while (true) {
                    const current = getRotation()
                    if (current !== lastRotation && lastRotation !== null) {
                        lastRotation = current
                        control.raiseEvent(rotationEventId, current)
                    } 
                    lastRotation = current
                    basic.pause(100)
                }
            })
        }
    }

    /**
     * Get acceleration value for a specific axis in G
     * @param axis the axis to read from
     */
    //% blockId=m5imu_get_accel block="acceleration (G) %axis"
    //% weight=90
    //% group="Accelerometer"
    export function getAcceleration(axis: Axis): number {
        switch (axis) {
            case Axis.X:
                return getAccelerationXYZ().x
            case Axis.Y:
                return getAccelerationXYZ().y
            case Axis.Z:
                return getAccelerationXYZ().z
        }
        return 0
    }

    export function getGyroscopeXYZ(): {x: number, y: number, z: number} {
        if (!initialized)
            init()
        
        let buf = readRegs(IMU_GYRO_XOUT_H, 6)
        let x = (buf[0] << 8) | buf[1]
        let y = (buf[2] << 8) | buf[3]
        let z = (buf[4] << 8) | buf[5]
        
        // Convert to signed 16-bit
        if (x > 32767) x -= 65536
        if (y > 32767) y -= 65536
        if (z > 32767) z -= 65536
        
        return {x: x * gRes, y: y * gRes, z: z * gRes}
    }

    /**
     * Get gyroscope value for a specific axis in degrees per second
     * @param axis the axis to read from
     */
    //% blockId=m5imu_get_gyro block="gyroscope (DPS) %axis"
    //% weight=80
    //% group="Gyroscope"
    export function getGyroscope(axis: Axis): number {
        switch (axis) {
            case Axis.X:
                return getGyroscopeXYZ().x
            case Axis.Y:
                return getGyroscopeXYZ().y
            case Axis.Z:
                return getGyroscopeXYZ().z
        }
        return 0
    }

    /**
     * Set accelerometer full scale range
     * @param scale the scale to set
     */
    //% blockId=m5imu_set_accel_scale block="set accelerometer scale %scale"
    //% weight=60
    //% group="Accelerometer"
    //% advanced=true
    export function setAccelScale(scale: AccelScale): void {
        if (!initialized) init()
        
        writeReg(IMU_ACCEL_CONFIG, scale << 3)
        basic.pause(10)
        currentAccelScale = scale
        updateAres()
    }

    /**
     * Set gyroscope full scale range
     * @param scale the scale to set
     */
    //% blockId=m5imu_set_gyro_scale block="set gyroscope scale %scale"
    //% weight=50
    //% group="Gyroscope"
    //% advanced=true
    export function setGyroScale(scale: GyroScale): void {
        if (!initialized) init()
        
        writeReg(IMU_GYRO_CONFIG, scale << 3)
        basic.pause(10)
        currentGyroScale = scale
        updateGres()
    }

    /**
     * Enable or disable FIFO
     * @param enable true to enable, false to disable
     */
    //% blockId=m5imu_fifo_enable block="set FIFO %enable"
    //% weight=40
    //% group="FIFO"
    //% advanced=true
    export function setFIFOEnable(enable: boolean): void {
        if (!initialized) init()
        
        writeReg(IMU_FIFO_EN, enable ? 0x18 : 0x00)
        writeReg(IMU_USER_CTRL, enable ? 0x40 : 0x00)
    }

    /**
     * Read FIFO count
     */
    //% blockId=m5imu_read_fifo_count block="FIFO count"
    //% weight=30
    //% group="FIFO"
    //% advanced=true
    export function readFIFOCount(): number {
        if (!initialized) init()
        
        let buf = readRegs(IMU_FIFO_COUNT, 2)
        return (buf[0] << 8) | buf[1]
    }

    /**
     * Reset FIFO
     */
    //% blockId=m5imu_reset_fifo block="reset FIFO"
    //% weight=20
    //% group="FIFO"
    //% advanced=true
    export function resetFIFO(): void {
        if (!initialized) init()
        
        let ctrl = readReg(IMU_USER_CTRL)
        writeReg(IMU_USER_CTRL, ctrl | 0x04)
    }

    /**
     * Get raw accelerometer ADC values (X axis)
     */
    //% blockId=m5imu_get_accel_adc_x block="raw acceleration X"
    //% weight=15
    //% group="Accelerometer"
    //% advanced=true
    export function getAccelAdcX(): number {
        if (!initialized) init()
        
        let buf = readRegs(IMU_ACCEL_XOUT_H, 2)
        let val = (buf[0] << 8) | buf[1]
        
        // Convert to signed 16-bit
        if (val > 32767) val -= 65536
        return val
    }

    /**
     * Get raw accelerometer ADC values (Y axis)
     */
    //% blockId=m5imu_get_accel_adc_y block="raw acceleration Y"
    //% weight=14
    //% group="Accelerometer"
    //% advanced=true
    export function getAccelAdcY(): number {
        if (!initialized) init()
        
        let buf = readRegs(IMU_ACCEL_XOUT_H + 2, 2)
        let val = (buf[0] << 8) | buf[1]
        
        // Convert to signed 16-bit
        if (val > 32767) val -= 65536
        return val
    }

    /**
     * Get raw accelerometer ADC values (Z axis)
     */
    //% blockId=m5imu_get_accel_adc_z block="raw acceleration Z"
    //% weight=13
    //% group="Accelerometer"
    //% advanced=true
    export function getAccelAdcZ(): number {
        if (!initialized) init()
        
        let buf = readRegs(IMU_ACCEL_XOUT_H + 4, 2)
        let val = (buf[0] << 8) | buf[1]
        
        // Convert to signed 16-bit
        if (val > 32767) val -= 65536
        return val
    }

    /**
     * Get raw gyroscope ADC values (X axis)
     */
    //% blockId=m5imu_get_gyro_adc_x block="raw gyroscope X"
    //% weight=12
    //% group="Gyroscope"
    //% advanced=true
    export function getGyroAdcX(): number {
        if (!initialized) init()
        
        let buf = readRegs(IMU_GYRO_XOUT_H, 2)
        let val = (buf[0] << 8) | buf[1]
        
        // Convert to signed 16-bit
        if (val > 32767) val -= 65536
        return val
    }

    /**
     * Get raw gyroscope ADC values (Y axis)
     */
    //% blockId=m5imu_get_gyro_adc_y block="raw gyroscope Y"
    //% weight=11
    //% group="Gyroscope"
    //% advanced=true
    export function getGyroAdcY(): number {
        if (!initialized) init()
        
        let buf = readRegs(IMU_GYRO_XOUT_H + 2, 2)
        let val = (buf[0] << 8) | buf[1]
        
        // Convert to signed 16-bit
        if (val > 32767) val -= 65536
        return val
    }

    /**
     * Get raw gyroscope ADC values (Z axis)
     */
    //% blockId=m5imu_get_gyro_adc_z block="raw gyroscope Z"
    //% weight=10
    //% group="Gyroscope"
    //% advanced=true
    export function getGyroAdcZ(): number {
        if (!initialized) init()
        
        let buf = readRegs(IMU_GYRO_XOUT_H + 4, 2)
        let val = (buf[0] << 8) | buf[1]
        
        // Convert to signed 16-bit
        if (val > 32767) val -= 65536
        return val
    }
}
