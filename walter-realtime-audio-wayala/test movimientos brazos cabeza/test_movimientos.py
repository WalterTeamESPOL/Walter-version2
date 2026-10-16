# Prueba de movimiento
# 
import time
import serial
import serial.tools.list_ports as port_list
port_robotis = "COM4" #verificar que sea el puerto correcto

#ports = list(port_list.comports())

#for port, desc, hwid in sorted(ports):
#        print("{}: {} [{}]".format(port, desc, hwid))
            
     
#port = ports[4].device       
#print("Este es el puerto a usar: ", port) #verificar que sea el puerto correcto COM7

baudrate = 1000000
serialPort = serial.Serial(port=port_robotis, baudrate=baudrate,
                                bytesize=8, timeout=1, stopbits=serial.STOPBITS_ONE)


#idpo;pitch;yaw;roll;posAlaL_v,posAlaL_h ,posAlaR_v,posAlaR_h,posPico

#txt = "02;100;50;50;50;50;50;50;50;0.1" #pitch up
#txt = "02;0;50;50;50;50;50;50;50;0.1" #pitch down

#txt = "02;50;100;50;50;50;50;50;50;0.1" #yaw izquierda 100
#txt = "02;50;0;50;50;50;50;50;50;0.1" #yaw derecha 0

#txt = "02;50;50;100;50;50;50;50;50;0.1" #roll izquierda 100
#txt = "02;50;50;0;50;50;50;50;50;0.1" #roll derecha 0

#txt = "02;50;50;50;0;50;50;50;50;0.1" #posAlaL_v 0 arriba
#txt = "02;50;50;50;100;50;50;50;50;0.1" #posAlaL_v 100 abajo

#txt = "02;50;50;50;50;0;50;50;50;0.1" #posAlaL_h 0 adelante
#txt = "02;50;50;50;50;100;50;50;50;0.1" #posAlaL_h 100 atras

#txt = "02;50;50;50;50;50;0;50;50;0.1" #posAlaR_v 0 arriba
#txt = "02;50;50;50;50;50;100;50;50;0.1" #posAlaR_v 100 abajo

#txt = "02;50;50;50;50;50;50;0;50;0.1" #posAlaR_h 0 adelante
#txt = "02;50;50;50;50;50;50;100;50;0.1" #posAlaR_h 100 atras

#txt = "02;50;50;50;50;50;50;50;0;0.1" #pico 0 abierto; 100 cerrado
#txt = "02;50;50;50;50;50;50;50;100;0.1" #100 cerrado


#txt = "02;50;50;50;50;50;50;50;50;0.1" #centro todos


f = open("bienvenida.movement", "r")
for linea in f:
    print(linea)
    x = linea.split(";") 
    idop = int(x[0],16)
    posPitch= int(x[1])
    posYaw= int(x[2])
    posRoll= int(x[3])
    posHombroDerechoFrontal = int(x[4])
    posHombroDerechoLateral = int(x[5])
    posCodoDerecho = int(x[6])
    posHombroIzquierdoFrontal = int(x[7])
    posHombroIzquierdoLateral= int(x[8])
    print(posHombroIzquierdoLateral)
    posCodoIzquierdo = int(x[9])
    print(posCodoIzquierdo)

    trama = bytearray([idop,posPitch,posYaw, posRoll,posHombroDerechoFrontal,posHombroDerechoLateral,posCodoDerecho,posHombroIzquierdoFrontal,posHombroIzquierdoLateral,posCodoIzquierdo])
    #print(trama)

    serialPort.write(trama)
    time.sleep(1) #0.1



# while True:
    # try:
        # # serialPort.reset_input_buffer()
        # # serialPort.reset_output_buffer()
        # #serialString = serialPort.read(10).hex()
        # #serialString = serialPort.read(20)
        # serialString = serialPort.readline()
        # print(serialString)
    # except KeyboardInterrupt:
        # break

serialPort.close()
