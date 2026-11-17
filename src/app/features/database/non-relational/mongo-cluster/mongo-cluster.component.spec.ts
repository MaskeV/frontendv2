import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MongoClusterComponent } from './mongo-cluster.component';

describe('MongoClusterComponent', () => {
  let component: MongoClusterComponent;
  let fixture: ComponentFixture<MongoClusterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MongoClusterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MongoClusterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
