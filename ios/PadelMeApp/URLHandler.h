#import <UIKit/UIKit.h>

void PadelMeAppConfigureFirebase(void);

BOOL PadelMeAppHandleOpenURL(
  UIApplication *app,
  NSURL *url,
  NSDictionary<UIApplicationOpenURLOptionsKey, id> *options);

BOOL PadelMeAppHandleContinueUserActivity(
  UIApplication *application,
  NSUserActivity *userActivity,
  void (^restorationHandler)(NSArray<id<UIUserActivityRestoring>> *_Nullable));
