import { Component, OnInit } from '@angular/core';
import { LoaderService } from '../../services/loader.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-loader',
    imports: [CommonModule],
    templateUrl: './loader.component.html',
    styleUrls: ['./loader.component.css']
})
export class LoaderComponent implements OnInit {

  loading = false;

  constructor(private loaderService: LoaderService) {}

  ngOnInit(): void {
    this.loaderService.loader$.subscribe((loading) => {
      this.loading = loading;
    });
  }
}
