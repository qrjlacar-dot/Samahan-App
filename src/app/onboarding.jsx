import { router } from "expo-router";
import { OnboardingPage } from "../components/OnboardingPage";
import { IMAGES } from "../constants/images";

export default function OnboardingScreen() {
  const handleLogin = () => {
    router.replace("/(auth)/login");
  };

  return (
    <OnboardingPage
      activePage={1}
      image={IMAGES.onboarding}
      title="Tara, samahan kita!"
      subtitle={"Bagong ruta? May kasama ka."}
      onSkip={handleLogin}
      onNext={() => router.push("/onboarding2")}
    />
  );
}
