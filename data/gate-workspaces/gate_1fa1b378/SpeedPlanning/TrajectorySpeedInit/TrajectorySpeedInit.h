/**
 * @file TrajectorySpeedInit.h
 * @brief è½¨è¿¹éåº¦åå§åæ¨¡åå¤´æä»¶
 */

#ifndef TRAJECTORY_SPEED_INIT_H
#define TRAJECTORY_SPEED_INIT_H

#define MAX_TRAJECTORY_POINTS 2000
#define MAX_PREDICTION_OBJECTS 50
#define MAX_PREDICTION_STEPS 20

typedef struct {
    double x; /* Xåæ  */
    double y; /* Yåæ  */
    double theta; /* èªåè§ */
    double kappa; /* æ²ç */
    double s; /* ç´¯è®¡è·ç¦» */
    double l; /* æ¨ªååç§» */
    double dkappa; /* æ²çå¯¼æ° */
    double v; /* éåº¦ */
    double a; /* å éåº¦ */
    double relativeTime; /* ç¸å¯¹æ¶é´ */
} PlanningPoint;

typedef struct {
    int pointCount; /* ç¹æ°é */
    PlanningPoint points[MAX_TRAJECTORY_POINTS]; /* è½¨è¿¹ç¹æ°ç» */
} PlanningTrajectory;

typedef struct {
    double x; /* Xåæ  */
    double y; /* Yåæ  */
} Point2D;

typedef struct {
    Point2D points[MAX_PREDICTION_STEPS]; /* é¢æµè½¨è¿¹ç¹ */
    double length; /* é¿åº¦ */
    double width; /* å®½åº¦ */
} PredictionObject;

typedef struct {
    int objCount; /* éç¢ç©æ°é */
    PredictionObject objects[MAX_PREDICTION_OBJECTS]; /* éç¢ç©æ°ç» */
} PredictionList;

typedef struct {
    double maxSpeed; /* æå¤§éåº¦ */
    double minSpeed; /* æå°éåº¦ */
    double d1; /* è·ç¦»ä¸é */
    double d2; /* è·ç¦»ä¸é */
    double predictFrequency; /* é¢æµé¢ç */
} SpeedInitParam;

typedef struct {
    PlanningTrajectory trajectory; /* è¾å¥è½¨è¿¹ */
    PredictionList prediction; /* éç¢ç©é¢æµ */
} SpeedInitInput;

typedef struct {
    PlanningTrajectory trajectory; /* è¾åºè½¨è¿¹ */
} SpeedInitOutput;

/**
 * @brief åå§åè½¨è¿¹éåº¦ä¸»å½æ°
 * @brief Initialize Speed for Trajectory
 */
void runTrajectorySpeedInit(const SpeedInitParam* param, const SpeedInitInput* input, SpeedInitOutput* output);

#endif /* TRAJECTORY_SPEED_INIT_H */