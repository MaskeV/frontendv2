import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MongoNodeComponent } from './mongo-node.component';

describe('MongoNodeComponent', () => {
  let component: MongoNodeComponent;
  let fixture: ComponentFixture<MongoNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MongoNodeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MongoNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
