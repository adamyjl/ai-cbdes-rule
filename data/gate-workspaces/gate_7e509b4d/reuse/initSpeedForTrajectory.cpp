void initSpeedForTrajectory(const TrajSpeedInitParam &param, const TrajSpeedInitInput &input, TrajSpeedInitOutput &output){
  
  PlanningTrajectory trajectory = input.trajectory;
  prediction::ObjectList prediction = input.prediction;

  int i = 0;
  double t = 0;
  double distance;
  bool stopFlag = false;
  for (i = 0; i < trajectory.planningPoints.size() - 1; i++)
  {
    GetMinObjDisParam param1;
    GetMinObjDisInput input1{
      trajectory.planningPoints[i], 
      prediction, 
      t
    };
    GetMinObjDisOutput output1{0};
    getMinDistanceOfPoint(param1, input1, output1);
    distance = output1.distance;


    SpeedModelParam param2{};
    SpeedModelInput input2{distance};
    SpeedModelOutput output2{0};
    speedModel(param2, input2, output2);
    trajectory.planningPoints[i].v = output2.speed;

    if (trajectory.planningPoints[i].v > 0){
      GetDistanceParam param3;
      GetDistanceInput input3{
        trajectory.planningPoints[i].x,
        trajectory.planningPoints[i].y,
        trajectory.planningPoints[i+1].x,
        trajectory.planningPoints[i+1].y
      };
      GetDistanceOutput output3{0};
      getDistance(param3, input3, output3);

      t += output3.distance / trajectory.planningPoints[i].v;
    }
    else{
      stopFlag = true;
      break;
    }
  }
  if (stopFlag)
  {
    for (; i < trajectory.planningPoints.size(); i++)
    {
      trajectory.planningPoints[i].v = 0;
    }
  }
  else
  {
    trajectory.planningPoints[i].v = trajectory.planningPoints[i-1].v;
  }

  output.globalTrajectory = trajectory;
}