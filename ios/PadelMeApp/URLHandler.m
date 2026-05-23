#import "URLHandler.h"
#import <FirebaseCore/FirebaseCore.h>
#import <GoogleSignIn/GoogleSignIn.h>
#import <React/RCTLinkingManager.h>

void PadelMeAppConfigureFirebase(void)
{
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }
}

BOOL PadelMeAppHandleOpenURL(
  UIApplication *app,
  NSURL *url,
  NSDictionary<UIApplicationOpenURLOptionsKey, id> *options)
{
  if ([GIDSignIn.sharedInstance handleURL:url]) {
    return YES;
  }
  return [RCTLinkingManager application:app openURL:url options:options];
}

BOOL PadelMeAppHandleContinueUserActivity(
  UIApplication *application,
  NSUserActivity *userActivity,
  void (^restorationHandler)(NSArray<id<UIUserActivityRestoring>> *_Nullable))
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}
