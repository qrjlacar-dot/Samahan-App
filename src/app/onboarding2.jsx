import { router } from "expo-router";
import { OnboardingPage } from "../components/OnboardingPage";
import { IMAGES } from "../constants/images";

export default function Onboarding2Screen() {
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/onboarding");
    }
  };

  const handleLogin = () => {
    router.replace("/(auth)/login");
  };

  return (
    <OnboardingPage
      activePage={2}
      image={IMAGES.onboarding2}
      title="Bawas ligaw, tara galaw!"
      subtitle={"Bus, jeep, train, o lakad?\nPlanuhin ang biyahe mula A hanggang B."}
      onBack={handleBack}
      onSkip={handleLogin}
      onNext={() => router.push("/onboarding3")}
    />
  );
}
