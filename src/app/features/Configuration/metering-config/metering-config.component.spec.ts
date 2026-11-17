import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeteringConfigComponent } from './metering-config.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MeteringConfigComponent', () => {
  let component: MeteringConfigComponent;
  let fixture: ComponentFixture<MeteringConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeteringConfigComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeteringConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
