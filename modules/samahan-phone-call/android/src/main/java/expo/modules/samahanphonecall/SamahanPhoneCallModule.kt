package expo.modules.samahanphonecall

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SamahanPhoneCallModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SamahanPhoneCall")

    // Personal mobile contacts only. Emergency hotlines use the system dialer.
    AsyncFunction("call") { number: String ->
      require(Regex("^(09[0-9]{9}|\\+639[0-9]{9})$").matches(number)) {
        "Only a valid personal mobile number can be called directly."
      }
      val activity = appContext.currentActivity
        ?: throw IllegalStateException("Open SAMAHAN before starting a call.")
      if (activity.checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
        throw SecurityException("Phone call permission has not been granted.")
      }
      val intent = Intent(Intent.ACTION_CALL, Uri.fromParts("tel", number, null))
      activity.startActivity(intent)
      true
    }.runOnQueue(Queues.MAIN)
  }
}
