/**
 * @file TrajectorySpeedInit.c
 * @brief è½¨è¿¹éåº¦åå§åæ¨¡åå®ç°
 */

#include "TrajectorySpeedInit.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>

/**
 * @brief è®¡ç®ä¸¤ç¹è·ç¦»
 * @details ç®åçæ¬§æ°è·ç¦»è®¡ç®
 * @param[in] x1 ç¬¬ä¸ä¸ªç¹Xåæ 
 * @param[in] y1 ç¬¬ä¸ä¸ªç¹Yåæ 
 * @param[in] x2 ç¬¬äºä¸ªç¹Xåæ 
 * @param[in] y2 ç¬¬äºä¸ªç¹Yåæ 
 * @param[out] dist è·ç¦»ç»æ
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void calcPointDistance(const double x1, const double y1, const double x2, const double y2, double* dist)
{
    double dx = 0.0;
    double dy = 0.0;
    dx = x1 - x2;
    dy = y1 - y2;
    *dist = sqrt(dx * dx + dy * dy);
}

/**
 * @brief è·åé¢æµéç¢ç©çæå°è·ç¦»
 * @details è®¡ç®å½åè½¨è¿¹ç¹ä¸ææé¢æµéç¢ç©çæå°è·ç¦»
 * @param[in] point å½åè½¨è¿¹ç¹
 * @param[in] prediction éç¢ç©é¢æµåè¡¨
 * @param[in] t å½åæ¶é´
 * @param[in] param åæ°
 * @param[out] minDist æå°è·ç¦»
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void getMinObjectDistance(const PlanningPoint* point, const PredictionList* prediction, const double t, const SpeedInitParam* param, double* minDist)
{
    int i = 0;
    int index = 0;
    double tRemainder = 0.0;
    PlanningPoint predictPoint;
    double d[4] = {0.0};
    double currentMin = 0.0;
    
    /* è®¡ç®é¢æµç´¢å¼ */
    if (param->predictFrequency > 0)
    {
        index = (int)(t / param->predictFrequency);
        tRemainder = t - (double)index * param->predictFrequency;
    }
    
    if (index >= 19)
    {
        *minDist = 100.0;
        return;
    }
    
    currentMin = 100.0; /* åå§åä¸ºå¤§å¼ */
    
    /* éåææéç¢ç© */
    for (i = 0; i < prediction->objCount; i++)
    {
        /* çº¿æ§æå¼è®¡ç®é¢æµä½ç½® */
        predictPoint.x = prediction->objects[i].points[index].x * (1.0 - tRemainder) + \
                         prediction->objects[i].points[index + 1].x * tRemainder;
        predictPoint.y = prediction->objects[i].points[index].y * (1.0 - tRemainder) + \
                         prediction->objects[i].points[index + 1].y * tRemainder;
        
        /* è®¡ç®å°éç¢ç©åä¸ªè§ç¹çè·ç¦» */
        calcPointDistance(point->x, point->y, \
                          predictPoint.x + prediction->objects[i].width / 2.0, \
                          predictPoint.y + prediction->objects[i].length / 2.0, \
                          &d[0]);
                          
        calcPointDistance(point->x, point->y, \
                          predictPoint.x - prediction->objects[i].width / 2.0, \
                          predictPoint.y + prediction->objects[i].length / 2.0, \
                          &d[1]);
                          
        calcPointDistance(point->x, point->y, \
                          predictPoint.x + prediction->objects[i].width / 2.0, \
                          predictPoint.y - prediction->objects[i].length / 2.0, \
                          &d[2]);
                          
        calcPointDistance(point->x, point->y, \
                          predictPoint.x - prediction->objects[i].width / 2.0, \
                          predictPoint.y - prediction->objects[i].length / 2.0, \
                          &d[3]);
        
        /* æ´æ°æå°è·ç¦» */
        if (d[0] < currentMin) { currentMin = d[0]; }
        if (d[1] < currentMin) { currentMin = d[1]; }
        if (d[2] < currentMin) { currentMin = d[2]; }
        if (d[3] < currentMin) { currentMin = d[3]; }
    }
    
    *minDist = currentMin;
}

/**
 * @brief éåº¦æ¨¡åè®¡ç®
 * @details æ ¹æ®è·ç¦»éå¶è®¡ç®ææéåº¦
 * @param[in] distance éç¢ç©è·ç¦»
 * @param[in] param éåº¦åæ°
 * @param[out] speed ææéåº¦
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void calcSpeedModel(const double distance, const SpeedInitParam* param, double* speed)
{
    double resultSpeed = 0.0;
    
    if (distance < 0)
    {
        resultSpeed = param->minSpeed;
    }
    else if (distance < param->d2)
    {
        resultSpeed = param->minSpeed;
    }
    else if (distance > param->d1)
    {
        resultSpeed = param->maxSpeed;
    }
    else
    {
        resultSpeed = param->minSpeed + (param->maxSpeed - param->minSpeed) * \
                     (distance - param->d2) / (param->d1 - param->d2);
    }
    
    *speed = resultSpeed;
}

/**
 * @brief åå§åè½¨è¿¹éåº¦ä¸»å½æ°
 * @brief Initialize Speed for Trajectory
 * @details ä¸ºç»å®è½¨è¿¹çæ¯ä¸ªç¹åéåå§éåº¦
 * @param[in] param è¾å¥åæ°
 * @param[in] input è¾å¥æ°æ®
 * @param[out] output è¾åºç»æ
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void runTrajectorySpeedInit(const SpeedInitParam* param, const SpeedInitInput* input, SpeedInitOutput* output)
{
    int i = 0;
    int pointCount = 0;
    double t = 0.0;
    double dist = 0.0;
    double distanceStep = 0.0;
    double minObstacleDist = 0.0;
    double currentSpeed = 0.0;
    int stopFlag = 0;
    
    /* å¤å¶è½¨è¿¹ */
    pointCount = input->trajectory.pointCount;
    if (pointCount > MAX_TRAJECTORY_POINTS)
    {
        pointCount = MAX_TRAJECTORY_POINTS;
    }
    
    memcpy(&output->trajectory, &input->trajectory, sizeof(PlanningTrajectory));
    
    t = 0.0;
    stopFlag = 0;
    
    /* éç¹è®¡ç®éåº¦ */
    for (i = 0; i < pointCount - 1; i++)
    {
        /* 1. è®¡ç®å°æè¿éç¢ç©çè·ç¦» */
        getMinObjectDistance(&input->trajectory.points[i], \
                             &input->prediction, \
                             t, \
                             param, \
                             &minObstacleDist);
        
        /* 2. æ ¹æ®è·ç¦»è®¡ç®éåº¦ */
        calcSpeedModel(minObstacleDist, param, &currentSpeed);
        output->trajectory.points[i].v = currentSpeed;
        
        /* 3. æ´æ°æ¶é´ */
        if (currentSpeed > 0)
        {
            calcPointDistance(input->trajectory.points[i].x, \
                              input->trajectory.points[i].y, \
                              input->trajectory.points[i+1].x, \
                              input->trajectory.points[i+1].y, \
                              &distanceStep);
            t = t + distanceStep / currentSpeed;
        }
        else
        {
            stopFlag = 1;
            break;
        }
    }
    
    /* å¤çåæ­¢ææåä¸ç¹ */
    if (1 == stopFlag)
    {
        for (; i < pointCount; i++)
        {
            output->trajectory.points[i].v = 0.0;
        }
    }
    else
    {
        output->trajectory.points[i].v = output->trajectory.points[i-1].v;
    }
}