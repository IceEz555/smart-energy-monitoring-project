#ifndef TASK_MEASURE_ELECTRICITY
#define TASK_MEASURE_ELECTRICITY

#include <Arduino.h>
#include "EmonLib.h"

#include "../config/config.h"
#include "../config/enums.h"
#include "mqtt-aws.h"

extern DisplayValues gDisplayValues;
extern EnergyMonitor emon1;
extern unsigned short measurements[];
extern unsigned char measureIndex;

void measureElectricity(void *parameter)
{
    for (;;)
    {
        serial_println("[ENERGY] Measuring...");
        long start = millis();

        double amps = emon1.calcIrms(2000);
        double watts = amps * HOME_VOLTAGE;

        gDisplayValues.amps = amps;
        gDisplayValues.watt = watts;

        measurements[measureIndex] = watts;
        measureIndex++;

        if (measureIndex == LOCAL_MEASUREMENTS)
        {
#if AWS_ENABLED == true
            xTaskCreate(
                uploadMeasurementsToAWS,
                "Upload measurements to AWS",
                10000, // Stack size (bytes)
                NULL,  // Parameter
                5,     // Task priority
                NULL   // Task handle
            );
#endif
            measureIndex = 0;
        }
        long end = millis();
        vTaskDelay((1000 - (end - start)) / portTICK_PERIOD_MS);
    }
}

#endif