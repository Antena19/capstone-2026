import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.html',
  styleUrl: './loader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Loader {
  readonly pantalla = input(false);
}
