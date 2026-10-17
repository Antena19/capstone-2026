import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Light });
      void StatusBar.setBackgroundColor({ color: '#2b161b' });
    }
  }
}
