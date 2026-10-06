import { router } from "expo-router";
import { OnboardingPage } from "../components/OnboardingPage";
import { IMAGES } from "../constants/images";

export default function Onboarding3Screen() {
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/onboarding2");
    }
  };

  const handleLogin = () => {
    router.replace("/(auth)/login");
  };

  return (
    <OnboardingPage
      activePage={3}
      image={IMAGES.onboarding3}
      title="Biyahe with peace of mind."
      subtitle={"I-save ang emergency contacts para madaling mahanap kapag kailangan."}
      onBack={handleBack}
      onSkip={handleLogin}
      onNext={handleLogin}
    />
  );
}
