void getMinDistanceOfPoint(const GetMinObjDisParam &param, const GetMinObjDisInput &input, GetMinObjDisOutput &output){
  PlanningPoint point = input.point;
  prediction::ObjectList prediction = input.prediction;
  double t = input.t;

  int index;
  double tRemainder;
  PlanningPoint predictTempPoint;
  std::vector<double> distanceFromObject;
  index = (int)t / param.predictFrequency;
  tRemainder = t - index * param.predictFrequency;

  if (index >= 19){
    output.distance = 100;
    return;
  }


  for (auto object : prediction.object()){
    predictTempPoint.x = object.predictpoint(index).x() * (1 - tRemainder) + object.predictpoint(index + 1).x() * tRemainder;
    predictTempPoint.y = object.predictpoint(index).y() * (1 - tRemainder) + object.predictpoint(index + 1).y() * tRemainder;
    
    GetDistanceParam param4;
    GetDistanceInput input4{
      point.x,
      point.y,
      predictTempPoint.x + object.w() / 2,
      predictTempPoint.y + object.l() / 2
    };
    GetDistanceOutput output4{0};
    getDistance(param4, input4, output4);

    GetDistanceParam param5;
    GetDistanceInput input5{
      point.x,
      point.y,
      predictTempPoint.x - object.w() / 2,
      predictTempPoint.y + object.l() / 2
    };
    GetDistanceOutput output5{0};
    getDistance(param5, input5, output5);

    GetDistanceParam param6;
    GetDistanceInput input6{
      point.x,
      point.y,
      predictTempPoint.x + object.w() / 2,
      predictTempPoint.y - object.l() / 2
    };
    GetDistanceOutput output6{0};
    getDistance(param6, input6, output6);    

    GetDistanceParam param7;
    GetDistanceInput input7{
      point.x,
      point.y,
      predictTempPoint.x - object.w() / 2,
      predictTempPoint.y -object.l() / 2
    };
    GetDistanceOutput output7{0};
    getDistance(param7, input7, output7);

    distanceFromObject.push_back(output4.distance);
    distanceFromObject.push_back(output5.distance);
    distanceFromObject.push_back(output6.distance);
    distanceFromObject.push_back(output7.distance);
  }

  if(distanceFromObject.size() > 0){
    FindMinParam param1;
    FindMinInput input1 = {distanceFromObject};
    FindMinOutput output1 = {0};
    findMin(param1, input1, output1);
    output.distance = output1.flag;

    return;
  }
  else{
    output.distance = 100;
    return;
  } 
}