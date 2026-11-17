import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MssqlComponent } from './mssql.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MssqlComponent', () => {
  let component: MssqlComponent;
  let fixture: ComponentFixture<MssqlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MssqlComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MssqlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
