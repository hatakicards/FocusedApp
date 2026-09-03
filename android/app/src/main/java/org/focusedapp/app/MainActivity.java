package org.focusedapp.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FocusedWidgetSyncPlugin.class);
        registerPlugin(FocusedScreenTimePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
