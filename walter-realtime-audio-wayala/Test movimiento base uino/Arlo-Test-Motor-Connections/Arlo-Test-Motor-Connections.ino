/*
  Arlo-Test-Motor-Connections
  
  Run this sketch to verify that your Arlo goes forward.
*/

#include <ArloRobot.h>                        // Include Arlo library
#include <SoftwareSerial.h>                   // Include SoftwareSerial library

ArloRobot Arlo;                               // Declare Arlo object
SoftwareSerial ArloSerial(12, 13);            // Declare SoftwareSerial object
                                              // DHB-10 -> I/O 12, DHB-10 <- I/O 13
int countsLeft, countsRight;                  // Encoder counting variables
                                              
void setup()                                  // Setup function
{
  tone(4, 3000, 2000);                        // Piezospeaker beep
  Serial.begin(9600);                         // Start terminal serial port

  ArloSerial.begin(19200);                    // Start DHB-10 serial communication
  Arlo.begin(ArloSerial);                     // Pass to Arlo object

  Arlo.clearCounts();                         // Clear encoder counts

  Arlo.writeMotorPower(0,0);               // Go forward very slowly
  delay(3000);                                //   for three seconds
  Arlo.writeMotorPower(0, 0);                 //   then stop
  countsLeft = Arlo.readCountsLeft();         // Get left & right encoder counts
  countsRight = Arlo.readCountsRight();

  Serial.print("countsLeft = ");              // Display encoder measurements 
  Serial.print(countsLeft, DEC);
  Serial.print(", countsRight = ");
  Serial.println(countsRight, DEC);
  Serial.println();
  
}

void loop() {}                                // Nothing for main loop
